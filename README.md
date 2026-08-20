# Thred

Cross-session agent memory with revision-aware graph storage, first-class abstention, and reproducible LongMemEval benchmarks.

**Hack Hydra Track 03 submission:** cross-session memory with revision-aware graph storage, correct abstention, and a reproducible LongMemEval V2 scale evaluation.

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

Use the resulting report in the submission form and demo video.

## Benchmark results

<!-- LongMemEval is the official evaluation dataset used for this submission. -->

| Evaluation | Thred | Vector-RAG | Evidence |
| --- | ---: | ---: | --- |
| LongMemEval V2 scale case | 100.0% | 100.0% | 44 sessions / ~128K tokens; temporal answer correct; 0 eval errors |

Latest reports: `apps/evals/reports/`. We disclose exact sample sizes and do not present small pilot samples as full-dataset accuracy.

## How Thred uses HydraDB

HydraDB is Thred's durable long-term memory layer, not an optional vector-search add-on.

1. Each session is extracted into atomic, evidence-backed memory claims.
2. HydraDB stores those claims together with their session, source-message, entity, and file provenance.
3. When a fact changes, Thred records an explicit `SUPERSEDES` relation rather than deleting the older fact. This supports both current-state and historical questions.
4. At query time, Thred uses HydraDB hybrid retrieval plus graph context, ranks the retrieved evidence by relevance and event time, and abstains with `NOT_FOUND` when evidence is insufficient.

Without HydraDB, Thred would lose its connected revision history, provenance traversal, and temporal graph retrieval; a plain vector store cannot represent those relationships reliably.

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

## Attribution

- [HydraDB](https://github.com/hydra-db/hydradb) provides the graph-backed long-term memory store used by Thred.
- [LongMemEval](https://github.com/xiaowu0162/LongMemEval) and [LongMemEval V2](https://github.com/xiaowu0162/LongMemEval-V2) provide the evaluation data; datasets remain outside this repository.
- OpenAI `gpt-4o-mini` was used as the configured extraction, answer, and evaluation-judge model for the reproducible benchmark runs.
