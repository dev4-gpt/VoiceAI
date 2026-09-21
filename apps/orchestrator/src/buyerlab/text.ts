/**
 * Clips a value to a max length with surrogate-safe truncation.
 * Returns empty string for non-strings.
 * Trims whitespace, slices to max chars, and drops a trailing lone HIGH surrogate (0xD800-0xDBFF).
 */
export function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  let s = value.trim().slice(0, max);
  // If the last character is a lone HIGH surrogate (0xD800-0xDBFF), drop it.
  const code = s.charCodeAt(s.length - 1);
  return code >= 0xd800 && code <= 0xdbff ? s.slice(0, -1) : s;
}
