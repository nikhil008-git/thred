# Track 03: reproducible evaluation workflow

Thred processes benchmark histories one session at a time. Every extracted claim is revision-resolved before durable storage; a changed value carries an explicit `SUPERSEDES` relation while source messages, evidence events, files, and sessions become provenance relations.

## Run a benchmark

1. Download one official dataset JSON locally and keep it outside the repository.
2. Set `DATABASE_URL` and `HYDRA_DB_API_KEY`. For local CLI runs, set a provider key such as `GROQ_API_KEY` or `OPENAI_API_KEY`. Optional: `EVAL_ANSWER_MODEL`, `EVAL_JUDGE_MODEL`, `MEMORY_EXTRACTION_MODEL`.
3. Create an evaluation workspace in Thred, then run:

```bash
# Balanced submission sample (~10 cases)
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval \
  --input /absolute/path/to/longmemeval.json \
  --workspace <workspace-id> \
  --stratified 2 \
  --concurrency 1

# Full comparison
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval-v2 \
  --input /absolute/path/to/longmemeval_s_cleaned.json \
  --workspace <workspace-id> \
  --concurrency 1
```

The command executes both strategies against the same cases and answer model:

- `VECTOR_RAG`: deterministic hashed-vector retrieval over raw message chunks.
- `THRED`: extraction, HydraDB ingestion, revision-aware context retrieval, and abstention.

It writes `EvalRun` and `EvalCaseResult` rows, then generates a Markdown comparison in `apps/evals/reports/`. The report includes accuracy, temporal/revision accuracy, abstention accuracy, eval errors, read/write tokens, and p50/p95 retrieval latency.

### CLI flags

| Flag | Purpose |
| --- | --- |
| `--dataset` | `longmemeval`, `longmemeval-v2`, or `beam` |
| `--input` | Path to official dataset JSON |
| `--workspace` | Thred workspace id |
| `--stratified N` | Pick N cases per category (abstention, temporal, revision, multi-session, single-session) |
| `--limit N` | Cap total cases after stratified sampling |
| `--strategy` | `VECTOR_RAG` or `THRED` only |
| `--concurrency` | Default `1` (required for Hydra provisioning) |

## Acceptance checks

- A later claim is selected as current and explicitly supersedes the older one.
- Historical retrieval retains the older claim.
- An unsupported question resolves to `NOT_FOUND`.
- Every returned memory has source-message or evidence provenance.
- Both baseline and Thred use the same answer model.

## Submission checklist

- [ ] Stratified LongMemEval report with non-`n/a` abstention and revision rows
- [ ] LongMemEval-V2 report (same command, `--dataset longmemeval-v2`)
- [ ] BEAM run when dataset is downloaded (`--dataset beam`)
- [ ] Demo: revision graph + `NOT_FOUND` + eval comparison
- [ ] Short video or screenshots of demo flow

Latest stratified reports are timestamped under `apps/evals/reports/`.
