const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201C', rdquo: '\u201D', copy: '\u00A9', middot: '\u00B7', bull: '\u2022'
};

const REPLACEMENT_CHAR = '\uFFFD';

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        const code = parseInt(h, 16);
        // Reject out-of-range and surrogate values
        if (code < 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return REPLACEMENT_CHAR;
        return String.fromCodePoint(code);
      } catch {
        return REPLACEMENT_CHAR;
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        const code = parseInt(d, 10);
        if (code < 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return REPLACEMENT_CHAR;
        return String.fromCodePoint(code);
      } catch {
        return REPLACEMENT_CHAR;
      }
    })
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

const BLOCK_TAGS = /<\/?(?:p|div|section|article|header|footer|main|nav|aside|ul|ol|li|h[1-6]|br|tr|table|blockquote|pre|form|fieldset|figure|figcaption|dl|dt|dd|hr)\b[^>]{0,2000}>/gi;
const strip = (s: string) => decodeEntities(s.replace(/<[^<>]{0,2000}>/g, '')).replace(/\s+/g, ' ').trim();

export interface ExtractedPage {
  title: string;
  headings: string[];
  text: string;
  links: string[];
}

/** Dependency-free extraction of visible text, headings and links. Bounded to avoid quadratic backtracking. */
export function extractPage(html: string, baseUrl: string): ExtractedPage {
  // Cap HTML length to avoid processing massive hostile payloads
  const capped = html.length > 1_000_000 ? html.substring(0, 1_000_000) : html;

  const title = strip(capped.match(/<title[^>]{0,2000}>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  const headings: string[] = [];
  for (const m of capped.matchAll(/<h([1-3])[^>]{0,2000}>([\s\S]{0,50000}?)<\/h\1>/gi)) {
    if (headings.length >= 100) break;
    headings.push(strip(m[2]));
  }

  const links = new Set<string>();
  for (const m of capped.matchAll(/<a\s[^>]{0,2000}?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    if (links.size >= 500) break;
    try {
      const u = new URL(decodeEntities(m[1] ?? m[2] ?? ''), baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      u.hash = '';
      links.add(u.href);
    } catch {
      /* ignore malformed href */
    }
  }

  // Remove script, style, etc. with bounded regex
  let body = capped
    .replace(/<!--[\s\S]{0,50000}?-->/g, '')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]{0,100000}?<\/\1>/gi, '')
    .replace(BLOCK_TAGS, '\n')
    .replace(/<[^<>]{0,2000}>/g, '');
  
  const text = decodeEntities(body)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return { title, headings, text, links: Array.from(links) };
}
