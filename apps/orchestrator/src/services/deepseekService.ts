if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

export interface DeepSeekCompletionOptions {
  model?: 'deepseek-chat' | 'deepseek-reasoner' | string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export class DeepSeekService {
  private apiKey: string | undefined;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_deepseek_api_key_here';
  }

  public async createCompletion(options: DeepSeekCompletionOptions): Promise<{
    content: string;
    reasoning_content?: string;
    tokens: { prompt: number; completion: number; total: number };
    model: string;
    /**
     * True when no live LLM call produced this content — no key configured, or
     * the API errored. Callers MUST check this before publishing, billing for,
     * or attributing the output to a model. Placeholder text presented as model
     * output is what let fabricated metrics reach real customer accounts.
     */
    isFallback: boolean;
  }> {
    const model = options.model || (process.env.DEEPSEEK_MODEL || 'deepseek-chat');

    if (!this.isConfigured()) {
      console.log(`[DeepSeek Service] No active API key found, generating high-fidelity fallback response using ${model}.`);
      return this.generateFallback(options);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          max_tokens: options.max_tokens ?? 2000,
          ...(model !== 'deepseek-reasoner' ? { temperature: options.temperature ?? 0.3 } : {}),
          ...(model !== 'deepseek-reasoner' && options.response_format ? { response_format: options.response_format } : {})
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepSeek API Error] HTTP ${response.status}:`, errorText);
        return this.generateFallback(options);
      }

      const data = (await response.json()) as any;
      const choice = data.choices[0];

      return {
        content: choice.message.content,
        reasoning_content: choice.message.reasoning_content,
        tokens: {
          prompt: data.usage?.prompt_tokens || 150,
          completion: data.usage?.completion_tokens || 350,
          total: data.usage?.total_tokens || 500
        },
        model: data.model || model,
        isFallback: false
      };
    } catch (err: any) {
      console.error('[DeepSeek Exception]', err.message);
      return this.generateFallback(options);
    }
  }

  /**
   * Placeholder output for when no live model call happened.
   *
   * This must never contain invented metrics, named customers, testimonials, or
   * claimed results. A previous version fabricated specifics ("Marcus added $42k
   * MRR in 60 days") and a `reasoning_content` string asserting that DeepSeek-R1
   * had reasoned about it. With ENABLE_REAL_PUBLISHING=true that content could be
   * auto-posted to a customer's real accounts as their own marketing — a
   * deceptive-endorsement problem, not just a bug.
   *
   * Structure is preserved so downstream JSON.parse callers keep working, but
   * every field is unmistakably a placeholder.
   */
  private generateFallback(options: DeepSeekCompletionOptions) {
    const userPrompt = options.messages[options.messages.length - 1]?.content || '';
    const NOTICE =
      'PLACEHOLDER — generated without a live model call because DEEPSEEK_API_KEY is unset or the API was unreachable. Not for publication.';

    if (options.response_format?.type === 'json_object' || userPrompt.includes('JSON')) {
      return {
        content: JSON.stringify({
          _fallbackNotice: NOTICE,
          thesis: '[Placeholder thesis — configure DEEPSEEK_API_KEY to generate real content.]',
          targetAudience: '[Placeholder audience]',
          twitterThread: [
            `1/ ${NOTICE}`,
            '2/ [Placeholder post — no model output available.]'
          ],
          newsletter: {
            subjectLine: '[Placeholder subject line]',
            previewText: NOTICE,
            bodyMarkdown: `### Placeholder\n\n${NOTICE}`,
            callToAction: '[Placeholder call to action]'
          },
          webinarScript: {
            hook: '[Placeholder hook]',
            coreProblem: '[Placeholder problem statement]',
            valueProposition: '[Placeholder value proposition]',
            offerClose: '[Placeholder close]'
          }
        }),
        // No reasoning happened, so no reasoning is reported.
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: 'fallback:none',
        isFallback: true
      };
    }

    return {
      content:
        'I can’t generate a full response right now — the language model isn’t configured on this server. Set DEEPSEEK_API_KEY to enable live replies.',
      tokens: { prompt: 0, completion: 0, total: 0 },
      model: 'fallback:none',
      isFallback: true
    };
  }
}

export const deepseekService = new DeepSeekService();
