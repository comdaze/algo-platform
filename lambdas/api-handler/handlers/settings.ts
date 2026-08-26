import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({ region: process.env.REGION });

// A single JSON secret holds the global LLM config for MLZero / OpenAI-compatible
// endpoints: { endpointUrl, modelId, provider, apiKey }. The secret is created by
// CDK (placeholder), so this handler only reads/writes its value.
const SECRET_ID = process.env.LLM_SECRET_ARN || 'algo/llm/config';

interface LlmConfig {
  endpointUrl?: string;
  modelId?: string;
  provider?: string;
  apiKey?: string;
}

async function readConfig(): Promise<LlmConfig> {
  try {
    const res = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    return res.SecretString ? (JSON.parse(res.SecretString) as LlmConfig) : {};
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'ResourceNotFoundException') return {};
    throw err;
  }
}

// GET /settings/llm — returns the config WITHOUT the API key (only hasApiKey).
export async function getLlmSettings() {
  const cfg = await readConfig();
  return {
    statusCode: 200,
    body: JSON.stringify({
      endpointUrl: cfg.endpointUrl || '',
      modelId: cfg.modelId || '',
      provider: cfg.provider || 'openai',
      hasApiKey: !!cfg.apiKey,
    }),
  };
}

// PUT /settings/llm — writes endpoint/model/provider; the API key is only updated
// when a non-empty apiKey is supplied (so editing the endpoint keeps the key).
export async function putLlmSettings(body: Record<string, unknown>) {
  const existing = await readConfig();
  const next: LlmConfig = {
    endpointUrl: typeof body.endpointUrl === 'string' ? body.endpointUrl.trim() : existing.endpointUrl || '',
    modelId: typeof body.modelId === 'string' ? body.modelId.trim() : existing.modelId || '',
    provider: typeof body.provider === 'string' && body.provider ? body.provider : existing.provider || 'openai',
    // Preserve the stored key unless a new non-empty one is provided.
    apiKey:
      typeof body.apiKey === 'string' && body.apiKey.length > 0 ? body.apiKey : existing.apiKey || '',
  };

  if (!next.endpointUrl || !next.modelId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'endpointUrl and modelId are required' }),
    };
  }

  await sm.send(
    new PutSecretValueCommand({ SecretId: SECRET_ID, SecretString: JSON.stringify(next) })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'LLM settings saved',
      endpointUrl: next.endpointUrl,
      modelId: next.modelId,
      provider: next.provider,
      hasApiKey: !!next.apiKey,
    }),
  };
}
