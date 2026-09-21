import { extractPage } from '../../buyerlab/htmlText';
import { parseRobots, isAllowedByRobots } from '../../buyerlab/robots';
import { crawl, CrawlFetch } from '../../buyerlab/crawler';
import { UnsafeUrlError } from '../../buyerlab/ssrf';

const PAGE = `<!doctype html><html><head><title>Veloce &amp; Co</title><style>.x{color:red}</style>
<script>window.secret = "do not include";</script></head><body>
<!-- hidden comment --><nav><a href="/pricing">Pricing</a> <a href="https://other.com/x">Other</a> <a href="#top">Top</a></nav>
<h1>Replace six tools</h1><p>Pricing is by &ldquo;signed proposal&rdquo; only.</p>
<h2>How it works</h2><ul><li>One</li><li>Two</li></ul><noscript>enable js</noscript>
<a href="/docs/guide.pdf">PDF</a><a href="/about#team">About</a></body></html>`;

describe('extractPage', () => {
  const r = extractPage(PAGE, 'https://veloceos.cloud/');
  it('reads title and headings', () => {
    expect(r.title).toBe('Veloce & Co');
    expect(r.headings).toEqual(['Replace six tools', 'How it works']);
  });
  it('keeps visible text and drops script, style, comments and noscript', () => {
    expect(r.text).toContain('Replace six tools');
    expect(r.text).toContain('Pricing is by \u201Csigned proposal\u201D only.');
    expect(r.text).not.toMatch(/secret|color:red|hidden comment|enable js/);
  });
  it('puts block elements on separate lines', () => {
    expect(r.text.split('\n')).toEqual(expect.arrayContaining(['One', 'Two']));
  });
  it('returns absolute, de-duplicated, hash-free http(s) links', () => {
    expect(r.links).toEqual([
      'https://veloceos.cloud/pricing',
      'https://other.com/x',
      'https://veloceos.cloud/',
      'https://veloceos.cloud/docs/guide.pdf',
      'https://veloceos.cloud/about'
    ]);
  });

  // Hostile input tests: all must complete in < 500 ms
  it('handles many unclosed tags linearly', () => {
    const start = Date.now();
    const result = extractPage('<script>'.repeat(50000), 'https://example.com/');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(result.text.length).toBeLessThan(10); // mostly empty
  });

  it('handles many angle brackets without backtracking', () => {
    const start = Date.now();
    const result = extractPage('<'.repeat(200000), 'https://example.com/');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(result.text.length).toBeLessThan(10);
  });

  it('handles many link tags without quadratic dedup', () => {
    const start = Date.now();
    const links = Array.from({ length: 60000 }, (_, i) => `<a href="/p${i}">link</a>`).join('');
    const result = extractPage(`<html><body>${links}</body></html>`, 'https://example.com/');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    // Links capped at 500
    expect(result.links.length).toBeLessThanOrEqual(500);
  });

  it('caps links at 500 and headings at 100', () => {
    const links = Array.from({ length: 600 }, (_, i) => `<a href="/p${i}">link</a>`).join('');
    const headings = Array.from({ length: 150 }, (_, i) => `<h1>H${i}</h1>`).join('');
    const result = extractPage(`<html><body>${headings}${links}</body></html>`, 'https://example.com/');
    expect(result.links.length).toBeLessThanOrEqual(500);
    expect(result.headings.length).toBeLessThanOrEqual(100);
  });

  it('decodes bad numeric entity &#x110000; to replacement character', () => {
    const result = extractPage('<p>test &#x110000; end</p>', 'https://example.com/');
    expect(result.text).toContain('\uFFFD');
  });

  it('decodes bad numeric entity &#99999999999; to replacement character', () => {
    const result = extractPage('<p>test &#99999999999; end</p>', 'https://example.com/');
    expect(result.text).toContain('\uFFFD');
  });

  it('decodes surrogate entity &#xD800; to replacement character', () => {
    const result = extractPage('<p>test &#xD800; end</p>', 'https://example.com/');
    expect(result.text).toContain('\uFFFD');
  });

  it('decodes valid entity &#65; correctly', () => {
    const result = extractPage('<p>test &#65; end</p>', 'https://example.com/');
    expect(result.text).toContain('A');
  });
});

describe('robots', () => {
  const txt = 'User-agent: *\nDisallow: /private\nAllow: /private/open\n\nUser-agent: growthvoiceos-buyerlab\nDisallow: /blocked\n';
  it('uses the group for our agent when one exists', () => {
    const rules = parseRobots(txt, 'GrowthVoiceOS-BuyerLab');
    expect(isAllowedByRobots(rules, '/blocked/x')).toBe(false);
    expect(isAllowedByRobots(rules, '/private')).toBe(true);
  });
  it('falls back to * and lets the longest match win', () => {
    const rules = parseRobots(txt, 'someone-else');
    expect(isAllowedByRobots(rules, '/private/secret')).toBe(false);
    expect(isAllowedByRobots(rules, '/private/open/page')).toBe(true);
    expect(isAllowedByRobots(rules, '/public')).toBe(true);
  });
  it('treats an empty Disallow as allow-all', () => {
    expect(isAllowedByRobots(parseRobots('User-agent: *\nDisallow:\n'), '/anything')).toBe(true);
  });
});

const html = (body: string, links: string[] = []) => `<html><head><title>T</title></head><body><p>${body}</p>${links.map((l) => `<a href="${l}">l</a>`).join('')}</body></html>`;
const long = 'Buyer facing copy that is long enough to count as real page content. '.repeat(6);

function fakeFetch(map: Record<string, { status?: number; body?: string }>, log: string[] = []): CrawlFetch {
  return async (url) => {
    log.push(url);
    const hit = map[url];
    if (!hit) return { finalUrl: url, status: 404, contentType: 'text/html', body: '', truncated: false };
    return { finalUrl: url, status: hit.status ?? 200, contentType: 'text/html', body: hit.body ?? '', truncated: false };
  };
}

describe('crawl', () => {
  it('crawls same-origin pages breadth-first and skips other origins and files', async () => {
    const log: string[] = [];
    const fetch = fakeFetch({
      'https://a.com/': { body: html(long, ['/one', '/two', 'https://b.com/x', '/file.pdf']) },
      'https://a.com/one': { body: html(long + ' one') },
      'https://a.com/two': { body: html(long + ' two') }
    }, log);
    const r = await crawl('https://a.com/', {}, { fetch });
    expect(r.pages.map((p) => p.url)).toEqual(['https://a.com/', 'https://a.com/one', 'https://a.com/two']);
    expect(log).not.toContain('https://b.com/x');
    expect(log).not.toContain('https://a.com/file.pdf');
  });

  it('stops at maxPages and reports truncation', async () => {
    const map: Record<string, { body: string }> = { 'https://a.com/': { body: html(long, ['/1', '/2', '/3', '/4']) } };
    for (const n of [1, 2, 3, 4]) map[`https://a.com/${n}`] = { body: html(long + n) };
    const r = await crawl('https://a.com/', { maxPages: 3 }, { fetch: fakeFetch(map) });
    expect(r.pages).toHaveLength(3);
    expect(r.truncated).toBe(true);
  });

  it('respects robots.txt', async () => {
    const fetch = fakeFetch({
      'https://a.com/robots.txt': { body: 'User-agent: *\nDisallow: /private\n' },
      'https://a.com/': { body: html(long, ['/private/x', '/ok']) },
      'https://a.com/ok': { body: html(long + ' ok') }
    });
    const r = await crawl('https://a.com/', {}, { fetch });
    expect(r.pages.map((p) => p.url)).toEqual(['https://a.com/', 'https://a.com/ok']);
    expect(r.skipped).toContainEqual({ url: 'https://a.com/private/x', reason: 'robots' });
  });

  it('stops when the deadline passes', async () => {
    let t = 0;
    const inner = fakeFetch({ 'https://a.com/': { body: html(long, ['/1']) }, 'https://a.com/1': { body: html(long + ' one') } });
    // robots.txt is free; every page costs 150 ms against a 100 ms deadline.
    const fetch: CrawlFetch = async (u, o) => {
      if (!u.endsWith('/robots.txt')) t += 150;
      return inner(u, o);
    };
    const r = await crawl('https://a.com/', { deadlineMs: 100 }, { fetch, now: () => t });
    expect(r.pages).toHaveLength(1);
    expect(r.truncated).toBe(true);
  });

  it('skips a link the guard refuses, but lets an unsafe START url throw', async () => {
    const guard: CrawlFetch = async (url) => {
      if (url.includes('169.254') || url.endsWith('/redir')) throw new UnsafeUrlError('no', 'private_address');
      return { finalUrl: url, status: 200, contentType: 'text/html', body: html(long, ['/redir']), truncated: false };
    };
    const r = await crawl('https://a.com/', {}, { fetch: guard });
    expect(r.pages).toHaveLength(1);
    expect(r.skipped).toContainEqual({ url: 'https://a.com/redir', reason: 'private_address' });
    await expect(crawl('http://169.254.169.254/', {}, { fetch: guard })).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('keeps thin pages out of the results but reports them', async () => {
    const r = await crawl('https://a.com/', {}, { fetch: fakeFetch({ 'https://a.com/': { body: '<html><body><div id="root"></div></body></html>' } }) });
    expect(r.pages).toHaveLength(0);
    expect(r.skipped).toContainEqual({ url: 'https://a.com/', reason: 'thin_content' });
  });

  it('respects deadline passed to every fetch and stops mid-crawl', async () => {
    let t = 0;
    const inner = fakeFetch({
      'https://a.com/': { body: html(long, ['/1', '/2', '/3']) },
      'https://a.com/1': { body: html(long + ' one') },
      'https://a.com/2': { body: html(long + ' two') }
    });
    const fetch: CrawlFetch = async (u, o) => {
      t += 100;
      if (o?.deadlineAt && t > o.deadlineAt) throw new Error('deadline exceeded');
      return inner(u, o);
    };
    const r = await crawl('https://a.com/', { deadlineMs: 250 }, { fetch, now: () => t });
    expect(r.pages.length).toBeLessThan(3);
    expect(r.truncated).toBe(true);
  });

  it('caps total fetch attempts at maxPages * 3 (including failed fetches)', async () => {
    const attempts: string[] = [];
    const fetch: CrawlFetch = async (u) => {
      attempts.push(u);
      // Most 404s, a few successes
      if (u.includes('/ok')) return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long, ['/ok2']), truncated: false };
      return { finalUrl: u, status: 404, contentType: 'text/html', body: '', truncated: false };
    };
    const r = await crawl('https://a.com/', { maxPages: 2 }, { fetch });
    // maxPages * 3 = 6 attempts total (including robots.txt)
    expect(attempts.length).toBeLessThanOrEqual(7); // robots + up to 6 pages
    expect(r.truncated).toBe(true);
  });

  it('skips same-origin link that 302s to another host', async () => {
    let fetchCalls: string[] = [];
    const smartFetch: CrawlFetch = async (u) => {
      fetchCalls.push(u);
      if (u === 'https://a.com/') return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long, ['/redir']), truncated: false };
      if (u === 'https://a.com/redir') return { finalUrl: 'https://b.com/landing', status: 200, contentType: 'text/html', body: html(long), truncated: false };
      return { finalUrl: u, status: 404, contentType: 'text/html', body: '', truncated: false };
    };
    const r = await crawl('https://a.com/', {}, { fetch: smartFetch });
    expect(r.pages.map((p) => p.url)).toEqual(['https://a.com/']);
    expect(r.skipped).toContainEqual({ url: 'https://a.com/redir', reason: 'cross_origin_redirect' });
  });

  it('handles apex to www redirect (origin changes but same-origin), fetches new robots.txt', async () => {
    const requests: string[] = [];
    const smartFetch: CrawlFetch = async (u) => {
      requests.push(u);
      // robots.txt for apex
      if (u === 'https://a.com/robots.txt') return { finalUrl: u, status: 200, contentType: 'text/plain', body: 'User-agent: *\nDisallow: /private\n', truncated: false };
      // robots.txt for www (no disallows)
      if (u === 'https://www.a.com/robots.txt') return { finalUrl: u, status: 200, contentType: 'text/plain', body: 'User-agent: *\n', truncated: false };
      // Start page redirects to www version
      if (u === 'https://a.com/') return { finalUrl: 'https://www.a.com/', status: 200, contentType: 'text/html', body: html(long, ['/page1', '/private']), truncated: false };
      // www pages
      if (u === 'https://www.a.com/page1') return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long + ' page1'), truncated: false };
      if (u === 'https://www.a.com/private') return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long + ' private'), truncated: false };
      return { finalUrl: u, status: 404, contentType: 'text/html', body: '', truncated: false };
    };
    const r = await crawl('https://a.com/', {}, { fetch: smartFetch });
    // Should have fetched robots.txt twice and ingested apex-redirected pages
    expect(requests.filter((u) => u.includes('robots')).length).toBeGreaterThanOrEqual(2);
    expect(r.pages.map((p) => p.url).sort()).toEqual(['https://www.a.com/', 'https://www.a.com/page1', 'https://www.a.com/private']);
  });

  it('deduplicates by finalUrl: two links that redirect to the same content yield one page', async () => {
    const smartFetch: CrawlFetch = async (u) => {
      if (u === 'https://a.com/') return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long, ['/old', '/new']), truncated: false };
      if (u === 'https://a.com/old') return { finalUrl: 'https://a.com/new', status: 301, contentType: 'text/html', body: html(long), truncated: false };
      if (u === 'https://a.com/new') return { finalUrl: u, status: 200, contentType: 'text/html', body: html(long), truncated: false };
      return { finalUrl: u, status: 404, contentType: 'text/html', body: '', truncated: false };
    };
    const r = await crawl('https://a.com/', {}, { fetch: smartFetch });
    expect(r.pages).toHaveLength(2); // / and /new (not /old since it redirects)
    expect(r.pages.map((p) => p.url)).toEqual(['https://a.com/', 'https://a.com/new']);
  });
});
