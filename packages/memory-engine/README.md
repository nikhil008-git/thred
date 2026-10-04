# memory-engine

Brain after the MCP route. Does not talk to Cursor directly. `@repo/memory-extractor` does the LLM. `@repo/hydra` and `@repo/working-memory` do the actual saves.

| Folder | Tool | Job |
|---|---|---|
| `src/checkpoint/` | `thread_checkpoint` | File new facts: revisions, Hydra write, Postgres handoff |
| `src/context/` | `thread_context` | Find current ranked memories, or say “I don’t know” |
| `src/resume/` | `thread_resume` | Latest unfinished task + related facts |
| `src/shared/` | both | Name keys + temporal graph model |

Public API is still `src/index.ts` (`@repo/memory-engine`). Folder READMEs list each file in one line.
