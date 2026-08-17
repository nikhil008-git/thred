# Track 03: reproducible evaluation workflow

Thred processes benchmark histories one session at a time. Every extracted claim is revision-resolved before durable storage; a changed value carries an explicit `SUPERSEDES` relation while source messages, evidence events, files, and sessions become provenance relations.

## Run a benchmark

1. Download one official dataset JSON locally and keep it outside the repository.
2. Set `DATABASE_URL` and `HYDRA_DB_API_KEY`. For local CLI runs, set a provider key such as `OPENAI_API_KEY`; in the workspace product, configure the equivalent provider through **Configure → BYOK providers**. `EVAL_ANSWER_MODEL` and `MEMORY_EXTRACTION_MODEL` are optional model overrides.
3. Create an evaluation workspace in Thred, then run:

```bash
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval-v2 \
  --input /absolute/path/to/dataset.json \
  --workspace <workspace-id>
```

The command executes both strategies against the same cases and answer model:

- `VECTOR_RAG`: deterministic hashed-vector retrieval over raw message chunks.
- `THRED`: extraction, HydraDB ingestion, revision-aware context retrieval, and abstention.

It writes `EvalRun` and `EvalCaseResult` rows, then generates a Markdown comparison in `apps/evals/reports/`. The report includes accuracy, temporal/revision accuracy, abstention accuracy, read/write tokens, p50, and p95 retrieval latency.

## Acceptance checks

- A later claim is selected as current and explicitly supersedes the older one.
- Historical retrieval retains the older claim.
- An unsupported question resolves to `NOT_FOUND`.
- Every returned memory has source-message or evidence provenance.
- Both baseline and Thred use the same answer model.
