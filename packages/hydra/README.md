# hydra

Talks to HydraDB. Does not decide ADD / IGNORE / SUPERSEDE. `@repo/memory-engine` decides; this package writes and reads sentences.

| Folder | Job |
|---|---|
| `src/write/` | Object → sentence → ingest into `long_term` |
| `src/read/` | Search those sentences |
| `src/setup/` | API client, retries, workspace database name |
| `src/types.ts` | Shared input/response types |

Public API is still `src/index.ts` (`@repo/hydra`).
