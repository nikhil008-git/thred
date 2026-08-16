const aliases: Record<string, string> = {
  postgres: "postgresql",
  "postgre sql": "postgresql",
  "postgres db": "postgresql",
  "mongo db": "mongodb",
  "mongo database": "mongodb",
  "production db": "production database",
  "prod database": "production database",
};

/** Produces a stable comparison key without changing the human-readable claim. */
export function normalizeEntity(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ");
  return aliases[normalized] ?? normalized;
}

export function memorySemanticKey(subject: string, predicate: string): string {
  return `${normalizeEntity(subject)}::${normalizeEntity(predicate)}`;
}
