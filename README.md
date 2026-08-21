# Thred

**Revision-aware, cross-session memory for AI agents.**

> Hack Hydra 2026 · Track 03: Memory + Context Retrieval

Thred is a durable memory layer for agents working across Cursor, Claude Code,
Codex, and OpenCode. It turns long, fragmented chat histories into verifiable
memory: decisions, facts, preferences, source evidence, revisions, and
resumable coding handoffs.

[Live deployment](https://www.thred.fun) · [MIT License](LICENSE)

## Demo

- [Watch the 3-minute demo on YouTube](https://www.youtube.com/watch?v=UfBfyImTVN4)
- [Demo video and architecture image on Google Drive](https://drive.google.com/drive/folders/1lmTU528e9bDM2fb6-cei-ZJcHYLowsZ2?usp=sharing)

## The problem

Cross-session agent work breaks down when the relevant information is spread
across dozens of conversations. Track 03 workloads can span 30–40 sessions and
more than 115K tokens per question. A useful memory layer has to do more than
retrieve semantically similar text:

- combine facts from many sessions while retaining chronology;
- represent facts that changed or were overwritten;
- show where an answer came from; and
- return `NOT_FOUND` when the answer is not supported by the history.

This last behavior is crucial. Long-context models can lose accuracy on these
tasks by inventing an answer for information that was never present. Thred
treats abstention as a first-class result rather than an edge case.

## What we built

Thred exposes a small MCP toolset that lets agents share memory regardless of
which client they use:

| Tool              | What it does                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `thread_remember` | Saves a durable, evidence-backed fact, decision, lesson, architecture choice, or preference. |
| `thread_context`  | Retrieves verified long-term context relevant to a question.                                 |
| `thread_history`  | Shows the chronological revision history for a fact or entity.                               |
| `thread_inspect`  | Traverses a memory’s provenance and graph relationships.                                     |

An agent can save “we chose PostgreSQL,” another can later replace it with
“we chose Neon Postgres,” and a third can ask both what is true now and why the
decision changed. The earlier claim is retained; it is never silently erased.

## Architecture

1. An agent session is processed into atomic, evidence-backed claims.
2. Claims are stored with workspace, session, source-message, entity, and file
   provenance.
3. When a claim changes, Thred writes an explicit `SUPERSEDES` relationship to
   the prior claim.
4. At query time, hybrid retrieval and graph context find candidate evidence.
5. A temporal resolver selects current or historical facts as requested.
6. If the evidence is insufficient, the answer is `NOT_FOUND`—never a guess.

## Why HydraDB matters

HydraDB is Thred’s durable long-term memory layer, not an optional vector-search
add-on. It stores the claims and their relationships, including session/source
provenance, entities, files, and `SUPERSEDES` edges. Thred uses HydraDB hybrid
retrieval with graph context to recover relevant evidence, then traverses those
links to explain revisions and answer temporal questions.

This graph-backed model is what makes “what changed?”, “what was true then?”,
and “what evidence supports this?” reliable. A vector store alone can surface
similar passages, but does not natively preserve revision history or connected
provenance.

## Benchmarks

We evaluate Thred against a deterministic hashed-vector RAG baseline using the
same answer model. The official datasets are [LongMemEval](https://github.com/xiaowu0162/LongMemEval),
[LongMemEval V2](https://github.com/xiaowu0162/LongMemEval-V2), and
[BEAM](https://github.com/mohammadtavakoli78/BEAM).

| Evaluation                | Vector-RAG |  Thred | What it demonstrates                                                               |
| ------------------------- | ---------: | -----: | ---------------------------------------------------------------------------------- |
| LongMemEval V2 scale case |     100.0% | 100.0% | Correct temporal answer across 44 sessions / ~128K tokens; zero evaluation errors. |

Reports are committed under [`apps/evals/reports`](apps/evals/reports). Sample
sizes are disclosed in each report; they are not presented as full-dataset
accuracy. In an early five-case LongMemEval stratified run, Thred scored 80.0%
against 60.0% for the vector baseline; this is directional only, not a
full-dataset claim. Thred deliberately accepts extra extraction and graph-
retrieval cost in exchange for revision-aware, provenance-backed memory.

## Run locally

### Prerequisites

- Node.js 18+
- PostgreSQL database
- HydraDB API key
- A model provider key: Groq or OpenAI

`npm install` installs every repository dependency through the npm workspace
lockfile. Create a `.env` file for the services you intend to run:

| Variable                                   | Required for                    | Notes                                             |
| ------------------------------------------ | ------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                             | API, frontend, evaluations      | PostgreSQL connection string.                     |
| `HYDRA_DB_API_KEY`                         | API, memory engine, evaluations | HydraDB access token.                             |
| `OPENAI_API_KEY` or `GROQ_API_KEY`         | Extraction and evaluations      | Configure at least one provider.                  |
| `BETTER_AUTH_SECRET`                       | Web authentication              | Signing/encryption secret.                        |
| `BETTER_AUTH_URL`, `FRONTEND_ORIGIN`       | Web authentication              | Local defaults point to `http://localhost:3000`.  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in                  | Required only when Google auth is enabled.        |
| `PORT`, `NEXT_PUBLIC_API_URL`              | Local development               | Optional API port and frontend API URL overrides. |

For MCP clients, configure `THRED_API_KEY`; `THRED_API_URL` is optional and
defaults to the production API URL.

```bash
npm install
npm run db:generate --workspace=@repo/db
npm run db:migrate --workspace=@repo/db
npm run dev
```

### Connect an MCP client

Create a Thred agent key in the dashboard, then add the following to an MCP
client such as Cursor, Claude Code, Codex, or OpenCode:

```json
{
  "mcpServers": {
    "thred": {
      "command": "npx",
      "args": ["-y", "@thred_nick_01/thred-mcp"],
      "env": {
        "THRED_API_KEY": "thrd_sk_…",
        "THRED_API_URL": "https://api.thred.fun"
      }
    }
  }
}
```

Use the same Thred key in each client to access the same workspace memory.

## Run tests and evaluations

```bash
npm run test --workspace=@repo/evals
npm run test --workspace=@repo/memory-extractor
npm run test --workspace=@repo/memory-engine
```

To run an official dataset locally, download its JSON first and supply its
absolute path:

```bash
npm run eval --workspace=@repo/evals -- \
  --dataset longmemeval \
  --input /path/to/longmemeval.json \
  --workspace <workspace-id> \
  --stratified 2 \
  --concurrency 1
```

The evaluator persists results and writes a timestamped Markdown report to
`apps/evals/reports/`. See [`apps/evals/README.md`](apps/evals/README.md) for
available datasets and flags.

## Tech stack

TypeScript, Node.js, Express, Next.js, React, Model Context Protocol (MCP),
HydraDB, Prisma/PostgreSQL, and OpenAI/Groq-compatible model providers.

## Public submission checklist

- **Complete source code:** this public monorepo contains the frontend, API,
  MCP server, memory engine, HydraDB adapter, tests, and evaluation runners.
- **Setup and run instructions:** see [Run locally](#run-locally), MCP setup,
  and [Run tests and evaluations](#run-tests-and-evaluations).
- **Dependencies and environment:** npm workspaces lock dependencies; required
  and optional environment variables are listed above.
- **Open-source license:** released under the [MIT License](LICENSE).
- **Commit eligibility:** the first participant-authored commit is dated
  August 14, 2026, after the August 12, 2026 cutoff.
- **No access request needed:** the repository, live deployment, architecture,
  setup instructions, evaluation reports, and attribution are public.

## Attribution

- [HydraDB](https://github.com/hydra-db/hydradb) provides the graph-backed
  long-term memory store.
- [LongMemEval](https://github.com/xiaowu0162/LongMemEval),
  [LongMemEval V2](https://github.com/xiaowu0162/LongMemEval-V2), and
  [BEAM](https://github.com/mohammadtavakoli78/BEAM) provide evaluation data.
- OpenAI `gpt-4o-mini` was used as the configured extraction, answer, and
  evaluation-judge model for the reproducible benchmark runs.
