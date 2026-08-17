# Track 03 evaluations

This package compares Thred against the same-answer-model Vector-RAG baseline. Download an official dataset JSON locally, then run:

```bash
# Balanced sample for submission (~10 cases)
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval \
  --input /absolute/path/to/dataset.json \
  --workspace <existing-workspace-id> \
  --stratified 2 \
  --concurrency 1
```

The loaders accept source records with `haystack_sessions`/`sessions`, `question`, and `answer` (or canonical Thred eval JSON). Each session must contain `turns`, `messages`, `conversation`, or `dialogue` with a role and text/content field. Results are persisted in Postgres and a timestamped Markdown report is emitted to `apps/evals/reports/`.

Required environment: `DATABASE_URL`, `HYDRA_DB_API_KEY`, and one answer/extraction provider key such as `GROQ_API_KEY` for CLI runs. In the workspace UI, configure provider credentials under **Configure → BYOK providers** instead. Optional: `MEMORY_EXTRACTION_MODEL`, `EVAL_ANSWER_MODEL`.

`EVAL_JUDGE_MODEL` optionally selects the shared semantic judge used for answer
matching. When unset, it uses `EVAL_ANSWER_MODEL`. This is required because
LongMemEval accepts semantically equivalent answer phrasing; it must not be
scored with string containment. For inspection, each persisted Thred case
includes the per-session extraction/write summary and the retrieval context.

## Flags

| Flag | Purpose |
| --- | --- |
| `--stratified N` | N cases per category: abstention, temporal, revision, multi-session, single-session |
| `--limit N` | Cap after stratified sampling |
| `--strategy` | Run only `VECTOR_RAG` or `THRED` |
