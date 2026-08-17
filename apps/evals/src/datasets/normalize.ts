import type { EvalCase, EvalCategory, EvalDataset, EvalSession } from "../types.js";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function messages(value: unknown, sessionIndex: number) {
  const turns = array(value);
  return turns.flatMap((turn, turnIndex) => {
    const item = record(turn);
    const role = string(item.role ?? item.speaker ?? item.author).toLowerCase();
    const content = string(item.content ?? item.text ?? item.message ?? item.value);
    if (!content) return [];
    const normalizedRole: "user" | "assistant" | "tool" = role === "assistant" || role === "tool" ? role : "user";
    return [{
      id: string(item.id ?? item.message_id, `s${sessionIndex}-m${turnIndex}`),
      role: normalizedRole,
      content,
    }];
  });
}

function sessions(value: unknown, dateValue?: unknown, idValue?: unknown): EvalSession[] {
  const dates = array(dateValue);
  const ids = array(idValue);
  return array(value).flatMap((session, index) => {
    const item = record(session);
    const turnSource = Array.isArray(session)
      ? session
      : item.messages ?? item.turns ?? item.conversation ?? item.dialogue;
    const result = messages(turnSource, index);
    return result.length ? [{
      id: string(item.id ?? item.session_id ?? ids[index], `session-${index + 1}`),
      occurredAt: string(item.occurredAt ?? item.date_time ?? item.datetime ?? item.timestamp ?? dates[index], new Date(0).toISOString()),
      messages: result,
    }] : [];
  });
}

/** Converts official source records (or a canonical Thred record) into one eval contract. */
export function normalizeDatasetRecord(source: unknown, dataset: EvalDataset, index: number): EvalCase {
  const item = record(source);
  const expectedAnswer = string(item.expectedAnswer ?? item.answer ?? item.gold_answer ?? item.reference_answer) || null;
  const rawCategory = string(item.category ?? item.question_type).toLowerCase();
  const answerSessionIds = array(item.answer_session_ids ?? item.answerSessionIds)
    .map((value) => string(value)).filter(Boolean);
  const shouldAbstain = Boolean(item.shouldAbstain ?? item.should_abstain)
    || string(item.id ?? item.question_id ?? item.uuid).toLowerCase().endsWith("_abs")
    || rawCategory.includes("abstain") || rawCategory.includes("unanswerable") || expectedAnswer === null;
  const category: EvalCategory | undefined = shouldAbstain ? "abstention"
    : rawCategory.includes("temporal") ? "temporal"
    : rawCategory.includes("update") || rawCategory.includes("revision") ? "revision"
    : rawCategory.includes("multi") ? "multi-session"
    : rawCategory ? "single-session" : undefined;

  return {
    id: string(item.id ?? item.question_id ?? item.uuid, `${dataset}-${index + 1}`),
    dataset,
    sessions: sessions(
      item.sessions ?? item.haystack_sessions ?? item.history ?? item.conversations,
      item.occurredAt ?? item.haystack_dates,
      item.session_ids ?? item.haystack_session_ids,
    ),
    question: string(item.question ?? item.query),
    expectedAnswer,
    shouldAbstain,
    ...(answerSessionIds.length ? { answerSessionIds } : {}),
    ...(category ? { category } : {}),
  };
}
