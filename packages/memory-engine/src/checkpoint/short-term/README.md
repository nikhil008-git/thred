# short-term

Current-task handoff only. Not searched by `thread_context`. `thread_resume` reads this later.

| File | TLDR |
|---|---|
| `save-working-memory.ts` | Writes the LLM’s `workingMemory` to Postgres `WorkingCheckpoint`, including the Hydra ids just saved. |
