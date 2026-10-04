# checkpoint

`thread_checkpoint` write path: extract facts, decide ADD / IGNORE / SUPERSEDE, write Hydra, save the Postgres handoff.

| File | TLDR |
|---|---|
| `ingest.ts` | Manager. Calls the LLM extractor, then revisions + Hydra writes + `saveCheckpoint`. |
| `engine.ts` | One claim: look up existing → decide → optionally write. |
| `revision-resolver.ts` | Same value → IGNORE. New value → SUPERSEDE. Nothing there → ADD. |
| `hydra-lookup.ts` | Asks HydraDB “do we already have this subject + predicate?” |
| `memory-cache.ts` | Remembers IDs just written, because HydraDB indexes slowly. |
| `graph-builder.ts` | Turns a claim into Hydra text + edges (`ABOUT`, `SUPPORTS`, `SUPERSEDES`). |
