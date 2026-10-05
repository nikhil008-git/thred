# memory-extractor

Turns a checkpoint's chat into JSON. Does not save anything. `memory-engine` calls this, then files the result.

| Path | Job |
|---|---|
| `src/extractor.ts` | Manager. Chunk the chat, call the model, drop exact dupes, backfill message ids. |
| `src/schema/` | The JSON shape: `longTerm` claims and optional `workingMemory`. |
| `src/model/` | Which LLM to call, and retries when the network drops. |

Public API is still `src/index.ts` (`@repo/memory-extractor`).
