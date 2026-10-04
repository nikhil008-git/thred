# shared

Used by both write (`checkpoint/`) and read (`context/`).

| File | TLDR |
|---|---|
| `entity-resolver.ts` | Stable keys. `postgres` and `PostgreSQL` become the same subject so they don’t store as two facts. |
| `temporal-graph.ts` | In-memory facts-over-time graph (current vs history vs SUPERSEDES). Tests use this; production writes the same edges through `checkpoint/long-term/graph-builder.ts` into HydraDB. |
