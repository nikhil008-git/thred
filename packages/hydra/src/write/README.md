# write

Puts long-term memories into HydraDB.

| File | TLDR |
|---|---|
| `sentence-builder.ts` | Graph-builder **object** → `{ text }` **sentence** (claim + `[Thred provenance]`). |
| `ingest.ts` | Batches sentences (≤850 tokens) and calls `context.ingest`. |
