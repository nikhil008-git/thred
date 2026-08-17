export type ModelProvider = "openai" | "groq" | "xai" | "openrouter" | "gemini" | "ollama" | "custom";

const defaults: Record<Exclude<ModelProvider, "custom">, { baseUrl: string; model: string; keyEnv?: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-5-mini", keyEnv: "OPENAI_API_KEY" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-20b", keyEnv: "GROQ_API_KEY" },
  xai: { baseUrl: "https://api.x.ai/v1", model: "grok-4-1-fast-reasoning", keyEnv: "XAI_API_KEY" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-oss-20b:free", keyEnv: "OPENROUTER_API_KEY" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.6-flash", keyEnv: "GEMINI_API_KEY" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
};

export type ModelConfig = { provider: ModelProvider; apiKey: string; baseURL: string; model: string };

export function resolveModelConfig(options: { apiKey?: string; baseURL?: string; model?: string; provider?: string; providerEnv?: string } = {}): ModelConfig {
  const provider = (options.provider
    ?? (options.providerEnv ? process.env[options.providerEnv] : undefined)
    ?? process.env.MODEL_PROVIDER
    ?? "openai").trim().toLowerCase() as ModelProvider;
  if (!(provider in defaults) && provider !== "custom") throw new Error(`Unsupported MODEL_PROVIDER: ${provider}`);
  const preset = provider === "custom" ? { baseUrl: "", model: "" } : defaults[provider];
  const keyEnv = provider === "custom" ? undefined : preset.keyEnv;
  const apiKey = options.apiKey ?? (keyEnv ? process.env[keyEnv] : undefined) ?? process.env.MODEL_API_KEY ?? (provider === "openai" ? process.env.OPENAI_API_KEY : undefined) ?? (provider === "ollama" || provider === "custom" ? "local" : undefined);
  const baseURL = options.baseURL ?? process.env.MODEL_BASE_URL ?? preset.baseUrl;
  const model = options.model ?? preset.model;
  if (!apiKey) throw new Error(`${keyEnv ?? "MODEL_API_KEY"} is required for ${provider} model access`);
  if (!baseURL || !model) throw new Error("MODEL_BASE_URL and model are required for custom providers");
  return { provider, apiKey, baseURL, model };
}
