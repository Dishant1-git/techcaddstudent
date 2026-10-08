import config from '../config/index.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 45000;
// Each model has its own rate limit, so the smaller one covers for the
// primary when it is throttled or unavailable.
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

export function isConfigured() {
  return Boolean(config.groqApiKey);
}

async function complete(model, messages) {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_completion_tokens: 900,
      reasoning_effort: 'low',
      include_reasoning: false
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Groq request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage || null, model };
}

export async function chat(messages) {
  const models = [...new Set([config.groqModel, FALLBACK_MODEL])];
  let lastError = null;
  for (const model of models) {
    try {
      return await complete(model, messages);
    } catch (err) {
      lastError = err;
      const retryable = err.status === 429 || err.status >= 500 || err.name === 'TimeoutError';
      if (!retryable) break;
    }
  }
  throw lastError;
}
