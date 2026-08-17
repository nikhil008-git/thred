# LongMemEval evaluation debug report — 2026-08-17

## Status

The original benchmark report is not trustworthy as a QA-accuracy measurement.
The principal failure was evaluator matching, not Vector-RAG ingestion or
retrieval. A full rerun is currently blocked by unavailable external services:
the configured Postgres endpoint refuses connections and HydraDB ingestion times
out from this environment.

## Before

| Metric | Vector-RAG | Thred |
| --- | ---: | ---: |
| Accuracy | 0.0% | 0.0% |
| Temporal accuracy | 0.0% | 0.0% |
| Revision accuracy | n/a | n/a |
| Abstention accuracy | 100.0% | 0.0% |
| Write tokens | 7137 | 10445 |
| Read tokens | 822 | 709 |
| p50 retrieval latency | 933ms | 4823ms |
| p95 retrieval latency | 933ms | 4823ms |

## End-to-end traced case

Case `gpt4_2655b836` was traced using `/private/tmp/test.json`.

| Stage | Observation |
| --- | --- |
| Input | Three timestamped sessions were normalized with the official session IDs. |
| Expected answer | `GPS system not functioning correctly` |
| Vector retrieval | Returned session `answer_4be1b6b4_3`, message `s1-m2`, which states that the user had a GPS issue and the system was replaced. |
| Generated answer | “The first issue you ran into after your car’s first service was a problem with the GPS system on March 22…” |
| Old evaluator | Incorrect: neither normalized string contained the other. |
| Corrected evaluator | Correct: the shared semantic judge accepted the equivalent answer. |

## Corrected metrics

| Metric | Vector-RAG | Thred |
| --- | ---: | ---: |
| Accuracy, traced case | 100.0% | n/a — HydraDB ingest timed out |
| Temporal accuracy, traced case | 100.0% | n/a — HydraDB ingest timed out |
| Abstention accuracy, traced case | n/a | n/a |

These are a one-case validation result, not a replacement full-benchmark score.

## Fixes applied

- Replaced lexical containment scoring with a shared semantic answer judge.
- Classified official LongMemEval question IDs ending in `_abs` as abstention cases.
- Scoped abstention accuracy to abstention cases only.
- Preserved official answer-session IDs and session timestamps during normalization.
- Persisted Thred ingestion summaries and retrieval context as case evidence for future traces.

## Verification

`npm run test --workspace=@repo/evals` passed: 3 tests.

`npm run check-types --workspace=@repo/evals` passed.

## Required next run

After Postgres and HydraDB are reachable, rerun the existing benchmark command
against the same input and workspace. The resulting report will contain valid
full-dataset after-metrics and persisted, inspectable Thred traces.
