# context

`thread_context` / history read path: search Hydra, rank, hide junk, maybe refuse to answer. No extractor LLM here.

| File | TLDR |
|---|---|
| `context-builder.ts` | Main read. Search → maybe expand query → rank → hide superseded → abstain if weak. |
| `history.ts` | Same search, but keeps old revisions, oldest first. |
| `query-intent.ts` | What kind of question? Count / “what’s current” / preference. Builds extra search phrases. |
| `ranker.ts` | Scores which Hydra chunks actually match the question. |
| `abstention.ts` | Nothing found, too irrelevant, or no proof → don’t answer. |
| `memory-text.ts` | Parses the stored text blob back into proof fields (messages, evidence, files). |
