import OpenAI from "openai";
import { resolveModelConfig } from "@repo/memory-extractor";
import type { AnswerJudge, AnswerModel } from "../types.js";

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

/** Shared answer model for both strategies; keeps the benchmark comparison fair. */
export class OpenAIAnswerModel implements AnswerModel {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(model = process.env.EVAL_ANSWER_MODEL ?? undefined) {
    const config = resolveModelConfig(model ? { model } : {});
    this.name = config.model;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 60_000, maxRetries: 0 });
  }

  async answer(input: { question: string; context: string }) {
    const response = await withRetry(() => this.client.chat.completions.create({
      model: this.name,
      messages: [
        { role: "system", content: "Answer only from the supplied context. If context does not support the answer, reply exactly NOT_FOUND." },
        { role: "user", content: `Question:\n${input.question}\n\nContext:\n${input.context}` },
      ],
    }));
    return {
      answer: response.choices[0]?.message?.content?.trim() || "NOT_FOUND",
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}

/**
 * LongMemEval answers are frequently valid paraphrases, so lexical containment
 * is not a benchmark-grade evaluator. This judge is shared by both strategies.
 */
export class OpenAIAnswerJudge implements AnswerJudge {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(model = process.env.EVAL_JUDGE_MODEL ?? process.env.EVAL_ANSWER_MODEL ?? undefined) {
    const config = resolveModelConfig(model ? { model } : {});
    this.name = config.model;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 60_000, maxRetries: 0 });
  }

  async judge(input: { question: string; expectedAnswer: string; answer: string }): Promise<boolean> {
    const response = await withRetry(() => this.client.chat.completions.create({
      model: this.name,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Decide whether the candidate answer correctly answers the question according to the reference answer. Accept concise equivalent paraphrases, but reject partial, contradictory, unsupported, or NOT_FOUND answers. Reply with exactly CORRECT or INCORRECT.",
        },
        { role: "user", content: `Question: ${input.question}\nReference answer: ${input.expectedAnswer}\nCandidate answer: ${input.answer}` },
      ],
    }));
    return response.choices[0]?.message?.content?.trim().toUpperCase() === "CORRECT";
  }
}
