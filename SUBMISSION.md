# Track 03 submission summary

## System

Thred implements cross-session agent memory:

- Session-by-session extraction into atomic claims
- Revision resolution (`ADD` / `IGNORE` / `SUPERSEDE`) with explicit graph edges
- HydraDB long-term storage + hybrid retrieval
- First-class abstention (`NOT_FOUND`) when evidence is insufficient
- Vector-RAG baseline with the **same answer model**

## Benchmarks

| Dataset | Adapter | Status |
| --- | --- | --- |
| LongMemEval | `longmemeval` | Official dataset used: stratified 5-case run, 80.0% Thred vs 60.0% Vector-RAG — see latest report in `apps/evals/reports/` |

### Reproduce

```bash
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval \
  --input /path/to/longmemeval.json \
  --workspace <workspace-id> \
  --stratified 2 \
  --concurrency 1
```

Reports include: accuracy, temporal/revision/abstention accuracy, eval errors, write/read tokens, p50/p95 latency.

## Demo script

1. Sign in → create workspace → configure BYOK provider
2. `thread_remember` a database choice (MongoDB)
3. Update to PostgreSQL — show supersession in graph / history
4. Ask unsupported question — show `NOT_FOUND`
5. Open evals report: Thred vs Vector-RAG on abstention + revision cases

## Acceptance mapping

| Requirement | Implementation |
| --- | --- |
| Facts across sessions | Per-session ingest + cross-session retrieval |
| Chronological / overwritten facts | `SUPERSEDES` in revision resolver + temporal graph |
| Missing information / abstention | `shouldAbstain` gate → `NOT_FOUND` |
| Beat vector store | Eval comparison in `apps/evals` |
| Read/write cost | Token + latency columns in reports |

## Tests

```bash
npm run test --workspace=@repo/evals          # 6 tests
npm run test --workspace=@repo/memory-extractor
npm run test --workspace=@repo/memory-engine
```
