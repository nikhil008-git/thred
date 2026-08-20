export type QueryIntent = {
  /** "how many", "list all" — needs every matching claim, not just the best one. */
  aggregation: boolean;
  /** "first", "when", "before" — ordering matters more than relevance. */
  temporal: boolean;
  /** "prefer", "recommend" — preference claims are phrased unlike the question. */
  preference: boolean;
  keywords: string[];
};

const stopWords = new Set([
  "a", "about", "after", "all", "am", "an", "and", "any", "are", "as", "at", "be", "been",
  "before", "but", "by", "can", "did", "do", "does", "for", "from", "had", "has", "have",
  "how", "i", "if", "in", "is", "it", "its", "many", "me", "more", "much", "my", "of", "on",
  "or", "should", "so", "some", "than", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "to", "was", "we", "were", "what", "when", "where", "which",
  "who", "why", "will", "with", "would", "you", "your",
]);

export function queryKeywords(question: string): string[] {
  const tokens = question.toLocaleLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? [];
  return [...new Set(tokens.filter((token) => token.length > 2 && !stopWords.has(token)))];
}

export function deriveQueryIntent(question: string): QueryIntent {
  const lowered = question.toLocaleLowerCase();
  return {
    aggregation: /\bhow many\b|\bhow much\b|\blist\b|\ball of\b|\beach of\b|\btotal\b|\bcount\b/.test(lowered),
    temporal: /\bfirst\b|\blast\b|\bearliest\b|\blatest\b|\bwhen\b|\bbefore\b|\bafter\b|\bthen\b|\bcurrent\b|\bnow\b|\bstill\b/.test(lowered),
    preference: /\bprefer\b|\bpreference\b|\brecommend\b|\blike\b|\bfavourite\b|\bfavorite\b|\bwant\b/.test(lowered),
    keywords: queryKeywords(question),
  };
}

/**
 * Hybrid recall is phrased for the question, but claims are stored as
 * subject/predicate/value. A keyword-only pass finds claims the question wording
 * misses, which is where a vector-only baseline stalls.
 */
export function expansionQueries(question: string, intent: QueryIntent): string[] {
  const queries: string[] = [];
  const keywordQuery = intent.keywords.slice(0, 8).join(" ");
  if (keywordQuery && keywordQuery !== question.trim().toLocaleLowerCase()) {
    queries.push(keywordQuery);
  }
  if (intent.preference) {
    const subject = intent.keywords.slice(0, 4).join(" ");
    if (subject) queries.push(`${subject} preference`);
  }
  return queries;
}
