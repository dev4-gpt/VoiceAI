import { safeFetch, SafeFetchResult } from './safeFetch';
import { UnsafeUrlError } from './ssrf';
import { extractPage } from './htmlText';
import { parseRobots, isAllowedByRobots, RobotsRule } from './robots';

export interface CrawledPage {
  url: string;
  title: string;
  headings: string[];
  text: string;
  status: number;
}
export interface CrawlResult {
  pages: CrawledPage[];
  skipped: Array<{ url: string; reason: string }>;
  truncated: boolean;
}
export type CrawlFetch = (url: string, o?: { accept?: RegExp; maxBytes?: number }) => Promise<SafeFetchResult>;

/** A page with less visible text than this is almost certainly client-rendered or empty. */
export const MIN_PAGE_TEXT_CHARS = 200;
const SKIP_EXT = /\.(pdf|png|jpe?g|gif|svg|webp|ico|css|js|mjs|json|xml|zip|gz|mp4|mp3|woff2?|ttf)(\?|$)/i;

export async function crawl(
  startUrl: string,
  opts: { maxPages?: number; deadlineMs?: number } = {},
  deps: { fetch?: CrawlFetch; now?: () => number } = {}
): Promise<CrawlResult> {
  const fetchPage = deps.fetch ?? ((u, o) => safeFetch(u, o));
  const now = deps.now ?? (() => Date.now());
  const maxPages = opts.maxPages ?? 12;
  const deadline = now() + (opts.deadlineMs ?? 40_000);

  const start = new URL(startUrl);
  const origin = start.origin;
  const pages: CrawledPage[] = [];
  const skipped: Array<{ url: string; reason: string }> = [];
  const queue: string[] = [start.href];
  const seen = new Set<string>(queue);
  let truncated = false;

  let rules: RobotsRule[] = [];
  try {
    const r = await fetchPage(`${origin}/robots.txt`, { accept: /^text\//i, maxBytes: 200_000 });
    if (r.status === 200) rules = parseRobots(r.body);
  } catch {
    /* no readable robots.txt: allow all */
  }

  // One request at a time, in order: courtesy to the host and a simple deadline.
  while (queue.length > 0) {
    if (pages.length >= maxPages || now() >= deadline) {
      truncated = true;
      break;
    }
    const url = queue.shift() as string;
    if (!isAllowedByRobots(rules, new URL(url).pathname)) {
      skipped.push({ url, reason: 'robots' });
      continue;
    }
    let res: SafeFetchResult;
    try {
      res = await fetchPage(url);
    } catch (err) {
      // The start URL failing the SSRF guard is the caller's problem; a bad link is just skipped.
      if (url === start.href && err instanceof UnsafeUrlError) throw err;
      skipped.push({ url, reason: err instanceof UnsafeUrlError ? err.reason : (err as { reason?: string }).reason ?? 'error' });
      continue;
    }
    if (res.status >= 400) {
      skipped.push({ url, reason: `http_${res.status}` });
      continue;
    }
    const page = extractPage(res.body, res.finalUrl);
    if (page.text.length < MIN_PAGE_TEXT_CHARS) {
      skipped.push({ url, reason: 'thin_content' });
    } else {
      pages.push({ url: res.finalUrl, title: page.title, headings: page.headings, text: page.text, status: res.status });
    }
    for (const link of page.links) {
      if (seen.has(link)) continue;
      seen.add(link);
      let u: URL;
      try {
        u = new URL(link);
      } catch {
        continue;
      }
      // Cross-origin links are never queued (so never fetched), and files are not pages.
      if (u.origin !== origin || SKIP_EXT.test(u.pathname)) continue;
      queue.push(link);
    }
  }
  if (queue.length > 0 && pages.length >= maxPages) truncated = true;
  return { pages, skipped, truncated };
}
