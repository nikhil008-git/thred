# long-term

Durable facts → HydraDB. `engine.ts` is the manager for one claim.

| Path | Job |
|---|---|
| `engine.ts` | Find existing → revision → maybe write. |
| `hydra/` | Talk to Hydra: lookup + write cache. |
| `revision/` | ADD / IGNORE / SUPERSEDE. |
| `graph/` | Claim → object (sentence is built in `@repo/hydra`). |
