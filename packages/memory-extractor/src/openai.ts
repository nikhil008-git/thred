import OpenAI from "openai";
import type { MemoryExtractionModel, MemoryExtractionRequest } from "./extractor.js";
import { resolveModelConfig } from "./provider.js";

function retryDelayMs(error: unknown, attempt: number): number | null {
  const details = error as { status?: number; message?: string };
  if (details.status !== 429 && (!details.status || details.status < 500)) return null;
  const requestedDelaySeconds = /try again in ([0-9.]+)s/i.exec(details.message ?? "")?.[1];
  const requestedDelayMs = requestedDelaySeconds ? Math.ceil(Number(requestedDelaySeconds) * 1000) : 0;
  return Math.max(requestedDelayMs + 1_000, Math.min(60_000, 5_000 * 2 ** attempt));
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = retryDelayMs(error, attempt);
      if (delayMs === null || attempt >= 8) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["longTerm", "workingMemory"],
  properties: {
    longTerm: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "subject", "predicate", "value", "reason", "confidence", "sourceMessageIds", "files"],
        properties: {
          kind: { type: "string", enum: ["fact", "decision", "lesson", "architecture", "preference"] },
          subject: { type: "string" },
          predicate: { type: "string" },
          value: { type: "string" },
          reason: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceMessageIds: { type: "array", items: { type: "string" } },
          files: { type: "array", items: { type: "string" } },
        },
      },
    },
    workingMemory: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["taskKey", "task", "status", "completed", "filesChanged", "tests", "blockers", "nextStep"],
      properties: {
        taskKey: { type: "string" },
        task: { type: "string" },
        status: { type: "string", enum: ["IN_PROGRESS", "BLOCKED", "DONE"] },
        completed: { type: "array", items: { type: "string" } },
        filesChanged: { type: "array", items: { type: "string" } },
        tests: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "string" } },
        nextStep: { type: ["string", "null"] },
      },
    },
  },
} as const;

type OpenAIMemoryExtractionOptions = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  provider?: string;
};

/** Server-only structured-output adapter for the OpenAI Responses API. */
export class OpenAIMemoryExtractionModel implements MemoryExtractionModel {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIMemoryExtractionOptions = {}) {
    const config = resolveModelConfig(options);
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 60_000, maxRetries: 0 });
    this.model = options.model ?? process.env.MEMORY_EXTRACTION_MODEL ?? config.model;
  }

  async extract(request: MemoryExtractionRequest, instructions: string): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await withRetry(() => this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 4_096,
        messages: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(request) }],
        response_format: { type: "json_schema", json_schema: { name: "thred_memory_extraction", strict: true, schema: extractionJsonSchema } },
      }));
      const output = response.choices[0]?.message?.content?.trim();
      if (!output) {
        lastError = new Error("Memory extraction returned no structured output");
      } else {
        try {
          return JSON.parse(output.replace(/^```json\s*|\s*```$/g, "")) as unknown;
        } catch (error) {
          lastError = error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    throw lastError instanceof Error ? lastError : new Error("Memory extraction returned invalid structured output");
  }
}
