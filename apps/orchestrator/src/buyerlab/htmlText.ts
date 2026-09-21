const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201C', rdquo: '\u201D', copy: '\u00A9', middot: '\u00B7', bull: '\u2022'
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

const BLOCK_TAGS = /<\/?(?:p|div|section|article|header|footer|main|nav|aside|ul|ol|li|h[1-6]|br|tr|table|blockquote|pre|form|fieldset|figure|figcaption|dl|dt|dd|hr)\b[^>]*>/gi;
const strip = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

export interface ExtractedPage {
  title: string;
  headings: string[];
  text: string;
  links: string[];
}

/** Dependency-free extraction of visible text, headings and links. Raw text only, never a summary. */
export function extractPage(html: string, baseUrl: string): ExtractedPage {
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => strip(m[2])).filter(Boolean);

  const links: string[] = [];
  for (const m of html.matchAll(/<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    try {
      const u = new URL(decodeEntities(m[1] ?? m[2] ?? ''), baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      u.hash = '';
      if (!links.includes(u.href)) links.push(u.href);
    } catch {
      /* ignore malformed href */
    }
  }

  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(BLOCK_TAGS, '\n')
    .replace(/<[^>]*>/g, '');
  const text = decodeEntities(body)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return { title, headings, text, links };
}
