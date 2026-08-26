import apiClient from './client';

export interface LlmSettings {
  endpointUrl: string;
  modelId: string;
  provider: string;
  hasApiKey: boolean;
}

// GET /settings/llm — never returns the API key, only hasApiKey.
export async function getLlmSettings(): Promise<LlmSettings> {
  const res = await apiClient.get<LlmSettings>('/settings/llm');
  return res.data;
}

// PUT /settings/llm — omit apiKey to keep the stored one; send it to replace.
export async function saveLlmSettings(input: {
  endpointUrl: string;
  modelId: string;
  provider?: string;
  apiKey?: string;
}): Promise<LlmSettings & { message: string }> {
  const res = await apiClient.put<LlmSettings & { message: string }>('/settings/llm', input);
  return res.data;
}
