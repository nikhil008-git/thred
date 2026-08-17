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

Reports: `apps/evals/reports/`.

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
