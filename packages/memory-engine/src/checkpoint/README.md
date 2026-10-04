# checkpoint

`thread_checkpoint` write path. `ingest.ts` is the manager: LLM extract → long-term Hydra → short-term Postgres.

| Path | Store | Job |
|---|---|---|
| `ingest.ts` | both | Orchestrator. Does not write itself. | 
| `long-term/` | HydraDB | Durable facts: revisions, then ingest. |
| `short-term/` | Postgres | Current-task handoff (`WorkingCheckpoint`). |

