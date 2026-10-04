# resume

`thread_resume`: load the current-task sticky note, then attach related long-term facts.

| File | TLDR |
|---|---|
| `resume-context.ts` | Reads the Postgres `WorkingCheckpoint` via `@repo/working-memory`, then calls `buildMemoryContext` with the task / next step / files as the query. |
