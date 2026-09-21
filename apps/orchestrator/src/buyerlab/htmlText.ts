const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©', middot: '·', bull: '•'
};

const REPLACEMENT_CHAR = '�';

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        const code = parseInt(h, 16);
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

export interface ExtractedPage {
  title: string;
  headings: string[];
  text: string;
  links: string[];
}

/** Linear-time extraction: single pass removes tags and special elements, extracts links and headings. */
export function extractPage(html: string, baseUrl: string): ExtractedPage {
  const capped = html.length > 1_000_000 ? html.substring(0, 1_000_000) : html;

  let title = '';
  const headings: string[] = [];
  const links = new Set<string>();
  let inTag = false;
  let inScript = false;
  let inStyle = false;
  let inComment = false;
  let inNoscript = false;
  let tagBuffer = '';
  let textBuffer = '';

  for (let i = 0; i < capped.length; i++) {
    const c = capped[i];
    const remaining = capped.substring(i);

    // Handle comments
    if (inComment) {
      if (remaining.startsWith('-->')) {
        inComment = false;
        i += 2;
      }
      continue;
    }
    if (!inTag && !inScript && !inStyle && !inNoscript && remaining.startsWith('<!--')) {
      inComment = true;
      i += 3;
      continue;
    }

    // Tag processing (always enter tag mode to detect closing tags)
    if (c === '<') {
      inTag = true;
      tagBuffer = '';
      continue;
    }

    if (inTag) {
      if (c === '>') {
        // Process the complete tag
        if (tagBuffer.match(/^script\b/i)) inScript = true;
        else if (tagBuffer.match(/^style\b/i)) inStyle = true;
        else if (tagBuffer.match(/^noscript\b/i)) inNoscript = true;
        else if (tagBuffer.match(/^\/script\b/i)) inScript = false;
        else if (tagBuffer.match(/^\/style\b/i)) inStyle = false;
        else if (tagBuffer.match(/^\/noscript\b/i)) inNoscript = false;
        else if (!inScript && !inStyle && !inNoscript && tagBuffer.match(/^title\b/i)) {
          const m = remaining.substring(1).match(/^([\s\S]*?)<\/title>/i);
          if (m) {
            title = decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
          }
        } else if (!inScript && !inStyle && !inNoscript && tagBuffer.match(/^h([1-3])\b/i) && headings.length < 100) {
          const hm = tagBuffer.match(/^h([1-3])/i);
          if (hm) {
            const num = hm[1];
            const hx = remaining.substring(1).match(new RegExp(`^([\\s\\S]*?)<\\/h${num}>`, 'i'));
            if (hx) {
              const ht = decodeEntities(hx[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
              if (ht) headings.push(ht);
            }
          }
        } else if (!inScript && !inStyle && !inNoscript && tagBuffer.match(/^a\s/i) && links.size < 500) {
          const hm = tagBuffer.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
          if (hm) {
            try {
              const href = decodeEntities(hm[1] ?? hm[2]);
              const u = new URL(href, baseUrl);
              if ((u.protocol === 'http:' || u.protocol === 'https:') && !links.has(u.href)) {
                u.hash = '';
                links.add(u.href);
              }
            } catch {
            }
          }
        } else if (!inScript && !inStyle && !inNoscript && tagBuffer.match(/^(?:p|div|section|article|header|footer|main|nav|aside|ul|ol|li|br|tr|table|blockquote|pre|form|fieldset|figure|figcaption|dl|dt|dd|hr)\b/i)) {
          textBuffer += '\n';
        }
        inTag = false;
        continue;
      }
      if (tagBuffer.length < 2000) tagBuffer += c;
      continue;
    }

    // Text content
    if (!inScript && !inStyle && !inNoscript) textBuffer += c;
  }

  const text = decodeEntities(textBuffer)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return { title, headings, text, links: Array.from(links) };
}
