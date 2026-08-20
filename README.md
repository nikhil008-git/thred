# Thred

Cross-session agent memory with revision-aware graph storage, first-class abstention, and reproducible LongMemEval benchmarks.

**Track 03 submission:** see [TRACK_03.md](./TRACK_03.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Quick start

```bash
npm install
npm run db:generate --workspace=@repo/db
npm run db:migrate --workspace=@repo/db
npm run dev
```

Configure `.env` with `DATABASE_URL`, `HYDRA_DB_API_KEY`, and a model provider key (`GROQ_API_KEY` or `OPENAI_API_KEY`).

## Run evals

```bash
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval \
  --input /path/to/longmemeval.json \
  --workspace <workspace-id> \
  --stratified 2 \
  --concurrency 1
```

Reports: `apps/evals/reports/` (each file includes a **Track 03 headline** section showing Thred vs Vector-RAG wins).

Run an official LongMemEval benchmark (a stratified sample costs roughly $5 or less with `gpt-4o-mini`):

```bash
./scripts/run-remaining-evals.sh
```

Paste the headline table from the resulting report into [SUBMISSION.md](./SUBMISSION.md) for judges.

## Benchmark results

<!-- LongMemEval is the official evaluation dataset used for this submission. -->

| Dataset | Thred accuracy | Vector-RAG accuracy | Thred wins (temporal / revision / abstention) |
| --- | ---: | ---: | --- |
| LongMemEval (stratified, 5 cases) | 80.0% | 60.0% | overall accuracy +20.0pp; temporal/revision/abstention tied at 100.0% |

Latest reports: `apps/evals/reports/`.

## Monorepo

| App / Package | Role |
| --- | --- |
| `apps/mcp` | MCP tools: remember, context, history, checkpoint, resume |
| `apps/evals` | LongMemEval / BEAM runners + Vector-RAG baseline |
| `packages/memory-engine` | Extraction pipeline, revision resolver, abstention |
| `packages/hydra` | HydraDB long-term memory adapter |

## Tests

```bash
npm run test --workspace=@repo/evals
npm run test --workspace=@repo/memory-extractor
npm run test --workspace=@repo/memory-engine
```
