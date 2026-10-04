# hydra

HydraDB reads used during checkpoint (not the ingest itself — that’s `@repo/hydra`).

| File | TLDR |
|---|---|
| `hydra-lookup.ts` | Ask Hydra: do we already have this subject + predicate? |
| `memory-cache.ts` | Remember IDs just written, because Hydra indexes slowly. |
