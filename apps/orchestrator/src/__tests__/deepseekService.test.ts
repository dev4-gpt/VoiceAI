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

  it('uses the server key when no apiKey override is given', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    await new DeepSeekService().createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer server-key');
  });

  it('uses the override apiKey when one is given, even if the server key is unset', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    const result = await new DeepSeekService().createCompletion({
      messages: [{ role: 'user', content: 'hi' }],
      apiKey: 'user-own-key'
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer user-own-key');
    expect(result.isFallback).toBe(false);
  });

  it('never mutates the instance server key when an override is used', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    const service = new DeepSeekService();
    await service.createCompletion({ messages: [{ role: 'user', content: 'hi' }], apiKey: 'user-own-key' });
    await service.createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer user-own-key');
    expect(fetchSpy.mock.calls[1][1].headers.Authorization).toBe('Bearer server-key');
  });

  it('defaults to the deepseek-flash model', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    await new DeepSeekService().createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body).model).toBe('deepseek-flash');
  });
});
