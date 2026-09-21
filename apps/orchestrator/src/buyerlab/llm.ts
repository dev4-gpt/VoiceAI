export interface BuyerLlmResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}
