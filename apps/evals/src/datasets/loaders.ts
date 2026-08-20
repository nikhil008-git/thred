import { readFile } from "node:fs/promises";
import { normalizeBeamDataset } from "./beam.js";
import { normalizeDatasetRecord } from "./normalize.js";
import type { EvalCase, EvalDataset } from "../types.js";

function records(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of ["data", "examples", "questions", "records"]) {
      if (Array.isArray(object[key])) return object[key] as unknown[];
    }
  }
  throw new Error("Dataset JSON must be an array or contain data, examples, questions, or records.");
}

export async function loadDataset(path: string, dataset: EvalDataset): Promise<EvalCase[]> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (dataset === "beam") {
    return normalizeBeamDataset(parsed, dataset).filter((item) => item.question && item.sessions.length);
  }
  return records(parsed).map((item, index) => normalizeDatasetRecord(item, dataset, index))
    .filter((item) => item.question && item.sessions.length);
}

export const loadLongMemEval = (path: string) => loadDataset(path, "longmemeval");
export const loadLongMemEvalV2 = (path: string) => loadDataset(path, "longmemeval-v2");
export const loadBeam = (path: string) => loadDataset(path, "beam");
