import type { EvalTask, TurnTelemetry, EvalGraderResult } from '@voice-os/shared';

export class DeepSeekModelJudge {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
  }

  public async evaluateTranscript(task: EvalTask, turns: TurnTelemetry[]): Promise<EvalGraderResult> {
    const transcriptText = turns.map((t) => `${t.speaker.toUpperCase()}: ${t.transcript}`).join('\n');

    const prompt = `You are an expert Anthropic-standard AI Evaluation Judge. Evaluate the following voice agent transcript against the task requirements.

Task Name: ${task.name}
Description: ${task.description}
Expected Success Criteria: ${JSON.stringify(task.successCriteria)}

Transcript:
${transcriptText}

Evaluate strictly on:
1. Empathy and Tone (1-5)
2. Accurate handling of user need without hallucinating policies or discounts (Pass/Fail)
3. Did the agent remain within strict business bounds? (Pass/Fail)

Return JSON format:
{
  "passed": boolean,
  "score": number (0.0 to 1.0),
  "reason": "Clear explanation of strengths or policy violations."
}`;

    if (!this.apiKey || this.apiKey === 'your_deepseek_api_key_here') {
      // This used to return passed:true with an invented, specific reason describing
      // behavior it had never observed. Fabricated eval data is worse than none,
      // because it reads as evidence. Report the gap instead.
      return {
        graderName: 'DeepSeekModelJudge (unavailable)',
        passed: false,
        score: 0,
        skipped: true,
        reason: 'not_run: DEEPSEEK_API_KEY is not set, so tone was not evaluated.'
      };
    }

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          // deepseek-chat is retired; deepseekService.ts defaults to deepseek-flash.
          model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error ${response.status}`);
      }

      const data = (await response.json()) as any;
      const parsed = JSON.parse(data.choices[0].message.content);

      return {
        graderName: 'DeepSeekModelJudge (R1-Reasoning)',
        passed: parsed.passed,
        score: parsed.score,
        reason: parsed.reason
      };
    } catch (err: any) {
      // A failed judge call is a missing measurement, not a pass. Returning
      // passed:true here meant any outage silently inflated the suite score.
      return {
        graderName: 'DeepSeekModelJudge (unavailable)',
        passed: false,
        score: 0,
        skipped: true,
        reason: `not_run: judge call failed (${err.message}).`
      };
    }
  }
}
