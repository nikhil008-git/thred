import OpenAI from "openai";
import { isTransientNetworkError, resolveModelConfig } from "@repo/memory-extractor";
import type { AnswerJudge, AnswerModel } from "../types.js";

function retryDelayMs(error: unknown, attempt: number): number | null {
  const details = error as { status?: number; message?: string };
  // Timeouts and dropped sockets arrive without an HTTP status; retrying them
  // keeps one transient fault from scoring a case as EVAL_ERROR.
  if (isTransientNetworkError(error)) return Math.min(30_000, 3_000 * 2 ** attempt);
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

/** Parses a judge reply; thinking models may bury CORRECT/INCORRECT after reasoning. */
export function parseJudgeVerdict(content: string | null | undefined): boolean {
  if (!content?.trim()) return false;
  const trimmed = content.trim();
  const upper = trimmed.toUpperCase();
  if (upper === "CORRECT") return true;
  if (upper === "INCORRECT" || upper.startsWith("INCORRECT")) return false;
  const lastLine = trimmed.split(/\n/).pop()?.trim().toUpperCase() ?? "";
  if (lastLine === "CORRECT" || lastLine.startsWith("CORRECT")) return true;
  if (lastLine === "INCORRECT" || lastLine.startsWith("INCORRECT")) return false;
  if (/\bCORRECT\b/.test(upper) && !/\bINCORRECT\b/.test(upper)) return true;
  return false;
}

/** Shared answer model for both strategies; keeps the benchmark comparison fair. */
export class OpenAIAnswerModel implements AnswerModel {
  readonly name: string;
  private readonly client: OpenAI;
  private readonly provider: string;

  constructor(model = process.env.EVAL_ANSWER_MODEL ?? undefined) {
    const config = resolveModelConfig(model
      ? { model, providerEnv: "EVAL_MODEL_PROVIDER" }
      : { providerEnv: "EVAL_MODEL_PROVIDER" });
    this.name = config.model;
    this.provider = config.provider;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 180_000, maxRetries: 2 });
  }

  async answer(input: { question: string; context: string }) {
    const response = await withRetry(() => this.client.chat.completions.create({
      model: this.name,
      // Greedy decoding: a benchmark comparison has to be reproducible, and at
      // the default temperature the same context can score differently per run.
      ...(this.provider === "gemini" ? {} : { temperature: 0 }),
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: [
            "Answer only from the supplied context, as briefly as the question allows.",
            "You may state a fact the context unambiguously implies, but never one it merely makes plausible.",
            "When the context lists several items, name all of them and give the exact count.",
            "When the context includes a revision timeline, answer with the most recent value unless the question asks about an earlier one.",
            "If the context does not contain the specific information asked for, reply exactly NOT_FOUND.",
          ].join(" "),
        },
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
  private readonly provider: string;

  constructor(model = process.env.EVAL_JUDGE_MODEL ?? process.env.EVAL_ANSWER_MODEL ?? undefined) {
    const config = resolveModelConfig(model
      ? { model, providerEnv: "EVAL_MODEL_PROVIDER" }
      : { providerEnv: "EVAL_MODEL_PROVIDER" });
    this.name = config.model;
    this.provider = config.provider;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 180_000, maxRetries: 2 });
  }

  async judge(input: { question: string; expectedAnswer: string; answer: string }): Promise<boolean> {
    const response = await withRetry(() => this.client.chat.completions.create({
      model: this.name,
      ...(this.provider === "gemini" ? {} : { temperature: 0 }),
      max_completion_tokens: 128,
      messages: [
        {
          role: "system",
          content: "Decide whether the candidate answer correctly answers the question according to the reference answer. Accept concise equivalent paraphrases, but reject partial, contradictory, unsupported, or NOT_FOUND answers. Reply with exactly one word on the final line: CORRECT or INCORRECT.",
        },
        { role: "user", content: `Question: ${input.question}\nReference answer: ${input.expectedAnswer}\nCandidate answer: ${input.answer}` },
      ],
    }));
    return parseJudgeVerdict(response.choices[0]?.message?.content);
  }
}
