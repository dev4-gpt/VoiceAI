import { clip } from '../../buyerlab/text';

describe('clip', () => {
  it('returns empty string for non-strings', () => {
    expect(clip(null, 100)).toBe('');
    expect(clip(undefined, 100)).toBe('');
    expect(clip(42, 100)).toBe('');
    expect(clip(true, 100)).toBe('');
    expect(clip({}, 100)).toBe('');
  });

  it('trims and slices to max length', () => {
    expect(clip('  hello world  ', 11)).toBe('hello world');
    expect(clip('  hello world  ', 5)).toBe('hello');
  });

  it('drops a trailing lone high surrogate (0xD800-0xDBFF)', () => {
    // Create a string ending with 399 ASCII chars + emoji (which is a surrogate pair)
    // When sliced to 400 chars, it will end with a lone high surrogate
    const ascii = 'a'.repeat(399);
    const emoji = '😀'; // 😀 (surrogate pair: high D83D + low DE00)
    const str = ascii + emoji;
    expect(str.length).toBe(401); // 399 + 2 for the pair
    const clipped = clip(str, 400);
    expect(clipped.length).toBe(399); // the lone surrogate is dropped
    expect(clipped).toBe(ascii);
  });

  it('preserves a trailing surrogate pair when it fits within max', () => {
    const ascii = 'a'.repeat(398);
    const emoji = '😀'; // 😀 (surrogate pair)
    const str = ascii + emoji;
    const clipped = clip(str, 400);
    expect(clipped).toBe(str);
  });

  it('preserves trailing ASCII characters', () => {
    const str = 'hello!';
    expect(clip(str, 10)).toBe('hello!');
  });
});
