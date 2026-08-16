import OpenAI from "openai";
import type { AnswerModel } from "../types.js";

/** Shared answer model for both strategies; keeps the benchmark comparison fair. */
export class OpenAIAnswerModel implements AnswerModel {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(model = process.env.EVAL_ANSWER_MODEL ?? "gpt-5-mini") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required to run eval answers");
    this.name = model;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async answer(input: { question: string; context: string }) {
    const response = await this.client.responses.create({
      model: this.name,
      instructions: "Answer only from the supplied context. If context does not support the answer, reply exactly NOT_FOUND.",
      input: `Question:\n${input.question}\n\nContext:\n${input.context}`,
      store: false,
    });
    return {
      answer: response.output_text.trim() || "NOT_FOUND",
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}
