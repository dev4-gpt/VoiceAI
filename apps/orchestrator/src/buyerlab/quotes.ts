const MARKS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  ' ': ' '
};

/** Collapse whitespace and unify typographic quotes and dashes. Case is preserved. */
export function normalizeText(s: string): string {
  return s
    .replace(/[‘’“”–— ]/g, (c) => MARKS[c])
    .replace(/\s+/g, ' ')
    .trim();
}

/** A quote shorter than this proves nothing ("the", "our"). */
export const MIN_QUOTE_CHARS = 12;

/** True only when `quote` appears verbatim in `sourceText` (after normalisation). A paraphrase fails. */
export function verifyQuote(quote: string, sourceText: string): boolean {
  const q = normalizeText(quote);
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normalizeText(sourceText).includes(q);
}
