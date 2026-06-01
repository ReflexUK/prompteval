/**
 * Provider-agnostic completion calls. Supports "anthropic" and "openai"
 * (OpenAI-compatible) providers. The model spec carries the provider, so a
 * single suite can mix models from different vendors.
 */
import { parseModelSpec } from "./config.js";

export interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

const ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
};

/** Resolve the base URL for a provider, honoring env overrides. */
export function baseUrlFor(provider: string, env: NodeJS.ProcessEnv): string {
  const generic = env[`PROMPTEVAL_${provider.toUpperCase()}_BASE_URL`];
  const standard =
    provider === "anthropic" ? env.ANTHROPIC_BASE_URL : env.OPENAI_BASE_URL;
  return (generic ?? standard ?? DEFAULT_BASE_URLS[provider] ?? "").replace(/\/+$/, "");
}

/** Run a single completion for a "provider/model" spec. */
export async function complete(
  modelSpec: string,
  prompt: string,
  options: CompleteOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const { provider, model } = parseModelSpec(modelSpec);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = baseUrlFor(provider, env);
  const maxTokens = options.maxTokens ?? 1024;

  const envKey = ENV_KEYS[provider];
  if (!envKey) throw new Error(`Unknown provider "${provider}" in "${modelSpec}"`);
  const apiKey = env[envKey];
  if (!apiKey) throw new Error(`${envKey} is not set (needed for "${modelSpec}")`);

  if (provider === "anthropic") {
    const res = await fetchImpl(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(options.system ? { system: options.system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await readJson(res, modelSpec);
    return (data?.content?.[0]?.text ?? "").trim();
  }

  // openai-compatible
  const messages = [
    ...(options.system ? [{ role: "system", content: options.system }] : []),
    { role: "user", content: prompt },
  ];
  const res = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  });
  const data = await readJson(res, modelSpec);
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

async function readJson(res: Response, modelSpec: string): Promise<any> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${modelSpec}: HTTP ${res.status} ${res.statusText} — ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}
