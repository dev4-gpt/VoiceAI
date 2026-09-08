import { DeepSeekService } from '../services/deepseekService';

describe('DeepSeekService fallback behavior', () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it('isConfigured() is false when no key is set', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(new DeepSeekService().isConfigured()).toBe(false);
  });

  it('isConfigured() is false for the placeholder key', () => {
    process.env.DEEPSEEK_API_KEY = 'your_deepseek_api_key_here';
    expect(new DeepSeekService().isConfigured()).toBe(false);
  });

  it('never calls fetch when unconfigured, and returns the fallback shape', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;

    const service = new DeepSeekService();
    const result = await service.createCompletion({
      messages: [{ role: 'user', content: 'hello' }]
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
  });
});
