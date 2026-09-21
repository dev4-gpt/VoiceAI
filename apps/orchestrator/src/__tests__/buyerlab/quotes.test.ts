import { normalizeText, verifyQuote, MIN_QUOTE_CHARS } from '../../buyerlab/quotes';

const source = 'Veloce replaces six tools.\n\n  Pricing is by "signed proposal" only — talk to us.';

describe('quote verification', () => {
  it('normalises whitespace and typographic marks', () => {
    expect(normalizeText('a  b\n\nc')).toBe('a b c');
    expect(normalizeText(`"hi" — it's`)).toBe(`"hi" - it's`);
  });

  it('accepts a verbatim quote across line breaks and smart quotes', () => {
    expect(verifyQuote('Veloce replaces six tools. Pricing is by "signed proposal" only', source)).toBe(true);
  });

  it('rejects a paraphrase', () => {
    expect(verifyQuote('Veloce replaces six different tools', source)).toBe(false);
  });

  it('rejects a quote that is too short to mean anything', () => {
    expect('the'.length).toBeLessThan(MIN_QUOTE_CHARS);
    expect(verifyQuote('the', 'the quick brown fox')).toBe(false);
  });

  it('is case sensitive, so a re-cased quote is not verbatim', () => {
    expect(verifyQuote('VELOCE REPLACES SIX TOOLS.', source)).toBe(false);
  });

  it('rejects empty input', () => {
    expect(verifyQuote('', source)).toBe(false);
    expect(verifyQuote('Veloce replaces six tools.', '')).toBe(false);
  });
});
