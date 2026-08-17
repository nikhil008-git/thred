import type { EvalCase, EvalCategory } from "../types.js";

const buckets: EvalCategory[] = ["abstention", "temporal", "revision", "multi-session", "single-session"];

/** Picks up to N cases per benchmark category for a balanced submission sample. */
export function stratifiedSample(cases: EvalCase[], perCategory: number): EvalCase[] {
  const picked: EvalCase[] = [];
  const used = new Set<string>();
  for (const bucket of buckets) {
    let count = 0;
    for (const evalCase of cases) {
      if (evalCase.category !== bucket || used.has(evalCase.id)) continue;
      picked.push(evalCase);
      used.add(evalCase.id);
      count += 1;
      if (count >= perCategory) break;
    }
  }
  return picked;
}
