# model

The LLM call. `extractor.ts` talks to `MemoryExtractionModel`, not to a vendor directly.

| File | TLDR |
|---|---|
| `openai.ts` | OpenAI-compatible chat call. Retries rate limits and dropped connections. |
| `provider.ts` | Picks base URL, model, and API key (OpenAI, Groq, Gemini, and the others). |
| `transient.ts` | Detects a dropped socket so the caller can retry. |
