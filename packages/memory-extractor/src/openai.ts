import OpenAI from "openai";
import type { MemoryExtractionModel, MemoryExtractionRequest } from "./extractor.js";

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["longTerm"],
  properties: {
    longTerm: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "subject", "predicate", "value", "confidence", "sourceMessageIds", "files"],
        properties: {
          kind: { type: "string", enum: ["fact", "decision", "lesson", "architecture", "preference"] },
          subject: { type: "string" },
          predicate: { type: "string" },
          value: { type: "string" },
          reason: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceMessageIds: { type: "array", items: { type: "string" } },
          files: { type: "array", items: { type: "string" } },
        },
      },
    },
    workingMemory: {
      type: "object",
      additionalProperties: false,
      required: ["taskKey", "task", "status", "completed", "filesChanged", "tests", "blockers"],
      properties: {
        taskKey: { type: "string" },
        task: { type: "string" },
        status: { type: "string", enum: ["IN_PROGRESS", "BLOCKED", "DONE"] },
        completed: { type: "array", items: { type: "string" } },
        filesChanged: { type: "array", items: { type: "string" } },
        tests: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "string" } },
        nextStep: { type: "string" },
      },
    },
  },
} as const;

type OpenAIMemoryExtractionOptions = {
  apiKey?: string;
  model?: string;
};

/** Server-only structured-output adapter for the OpenAI Responses API. */
export class OpenAIMemoryExtractionModel implements MemoryExtractionModel {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIMemoryExtractionOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for memory extraction");

    this.client = new OpenAI({ apiKey });
    this.model = options.model ?? process.env.MEMORY_EXTRACTION_MODEL ?? "gpt-5-mini";
  }

  async extract(request: MemoryExtractionRequest, instructions: string): Promise<unknown> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions,
      input: JSON.stringify(request),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "thred_memory_extraction",
          strict: true,
          schema: extractionJsonSchema,
        },
      },
    });

    if (!response.output_text) throw new Error("Memory extraction returned no structured output");
    return JSON.parse(response.output_text) as unknown;
  }
}
