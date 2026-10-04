# long-term

Durable facts. After ADD / SUPERSEDE, these go to HydraDB `long_term`. IGNORE is not written.

| File | TLDR |
|---|---|
| `engine.ts` | One claim: look up existing → decide → optionally write. |
| `revision-resolver.ts` | Same value → IGNORE. New value → SUPERSEDE. Nothing there → ADD. |
| `hydra-lookup.ts` | Asks HydraDB “do we already have this subject + predicate?” |
| `memory-cache.ts` | Remembers IDs just written, because HydraDB indexes slowly. |
| `graph-builder.ts` | Turns a claim into the **object** hydra later turns into a sentence. |
