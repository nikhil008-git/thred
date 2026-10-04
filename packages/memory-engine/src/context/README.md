# context

`thread_context` read path. `context-builder.ts` is the manager: search Hydra → rank → maybe refuse. No extractor LLM here.

| Path | Job |
|---|---|
| `context-builder.ts` | Main read. Search, expand, rank, hide superseded, abstain. |
| `rank/` | What kind of question, then score the chunks. |
| `abstain/` | Don’t answer if empty / weak / no proof. |
| `text/` | Parse the Hydra sentence back into proof fields. |
| `history/` | Same search, keep old revisions. |
