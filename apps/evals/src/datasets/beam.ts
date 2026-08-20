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

function beamCategory(raw: string): EvalCategory | undefined {
  const value = raw.toLowerCase();
  if (value.includes("abstain") || value.includes("unanswerable") || value.includes("missing")) return "abstention";
  if (value.includes("temporal") || value.includes("time") || value.includes("chrono")) return "temporal";
  if (value.includes("update") || value.includes("revision") || value.includes("overwrite")) return "revision";
  if (value.includes("multi")) return "multi-session";
  return value ? "single-session" : undefined;
}

function parseProbingQuestions(value: unknown): Array<RecordValue & { beamCategory?: string }> {
  let parsed: unknown = value;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => record(item));
  }

  const grouped = record(parsed);
  const flat: Array<RecordValue & { beamCategory?: string }> = [];
  for (const [category, items] of Object.entries(grouped)) {
    for (const item of array(items)) {
      flat.push({ ...record(item), beamCategory: category });
    }
  }
  return flat;
}

function expectedFromQuestion(question: RecordValue): string | null {
  const gold = string(
    question.gold_answer
    ?? question.goldAnswer
    ?? question.answer
    ?? question.ideal_response
    ?? question.idealResponse,
  );
  if (gold) return gold;
  const atoms = array(question.atoms ?? question.nuggets).map((item) => string(item)).filter(Boolean);
  return atoms.length ? atoms.join("; ") : null;
}

function messagesFromTurns(turns: unknown[], sessionIndex: number): EvalSession["messages"] {
  return turns.flatMap((turn, turnIndex) => {
    const item = record(turn);
    const roleRaw = string(item.role ?? item.speaker ?? item.from ?? item.name).toLowerCase();
    const content = string(item.content ?? item.text ?? item.message ?? item.value);
    if (!content) return [];
    const role: "user" | "assistant" | "tool" = roleRaw === "assistant" || roleRaw === "tool" ? roleRaw : "user";
    return [{
      id: string(item.id, `s${sessionIndex}-m${turnIndex}`),
      role,
      content,
    }];
  });
}

function sessionsFromChat(chat: unknown): EvalSession[] {
  const entries = array(chat);
  if (!entries.length) return [];

  const first = entries[0];
  if (Array.isArray(first)) {
    return entries.flatMap((session, index) => {
      const messages = messagesFromTurns(array(session), index);
      const sample = record(array(session)[0]);
      return messages.length ? [{
        id: string(sample.index, `session-${index + 1}`),
        occurredAt: string(sample.time_anchor ?? sample.timestamp, new Date(0).toISOString()),
        messages,
      }] : [];
    });
  }

  const messages = messagesFromTurns(entries, 0);
  const sample = record(entries[0]);
  return messages.length ? [{
    id: string(sample.index, "session-1"),
    occurredAt: string(sample.time_anchor ?? sample.timestamp, new Date(0).toISOString()),
    messages,
  }] : [];
}

function conversationsFromPayload(parsed: unknown): RecordValue[] {
  const root = record(parsed);
  if (Array.isArray(parsed)) return parsed.map((item) => record(item));
  for (const key of ["conversations", "data", "examples", "records"]) {
    const items = array(root[key]);
    if (items.length) return items.map((item) => record(item));
  }
  return [root];
}

/** Expands BEAM conversations into one eval case per probing question. */
export function normalizeBeamDataset(parsed: unknown, dataset: EvalDataset = "beam"): EvalCase[] {
  const cases: EvalCase[] = [];
  for (const [conversationIndex, conversation] of conversationsFromPayload(parsed).entries()) {
    const entryId = string(conversation.entry_id ?? conversation.conversation_id, `beam-${conversationIndex + 1}`);
    const sessions = sessionsFromChat(conversation.chat ?? conversation.history ?? conversation.messages);
    if (!sessions.length) continue;

    for (const [questionIndex, question] of parseProbingQuestions(conversation.probing_questions ?? conversation.questions).entries()) {
      const expectedAnswer = expectedFromQuestion(question);
      const rawCategory = string(question.beamCategory ?? question.category ?? question.question_type ?? question.type);
      const shouldAbstain = rawCategory.toLowerCase() === "abstention"
        || Boolean(question.should_abstain ?? question.shouldAbstain ?? question.abstention_type)
        || rawCategory.toLowerCase().includes("abstain")
        || (expectedAnswer?.toLowerCase().includes("no information") ?? false);
      const category = shouldAbstain ? "abstention" : beamCategory(rawCategory);
      const questionText = string(question.question ?? question.query);
      if (!questionText) continue;

      cases.push({
        id: string(question.question_id ?? question.id, `${entryId}_q${questionIndex + 1}`),
        dataset,
        sessions,
        question: questionText,
        expectedAnswer,
        shouldAbstain,
        ...(category ? { category } : {}),
      });
    }
  }
  return cases;
}
