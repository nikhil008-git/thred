# Thred

**Revision-aware, cross-session memory for AI agents.**

Thred is a durable memory layer for agents working across Cursor, Claude Code,
Codex, and OpenCode. It turns long, fragmented chat histories into verifiable
memory — decisions, facts, preferences, source evidence, revisions, and
resumable coding handoffs.

**[Get started → thred.fun](https://www.thred.fun)** · [MIT License](LICENSE)

## The problem

Cross-session agent work breaks down when the relevant information is spread
across dozens of conversations. Long-running projects can span 30–40 sessions
and more than 115K tokens per question. A useful memory layer has to do more
than retrieve semantically similar text:

- combine facts from many sessions while retaining chronology;
- represent facts that changed or were overwritten;
- show where an answer came from; and
- return `NOT_FOUND` when the answer is not supported by the history.

Copy-pasting the last session into the next prompt works for a short handoff,
but not across dozens of sessions: the context window fills up, older facts get
missed, and agents confuse superseded decisions with current ones. Thred fixes
that with atomic, provenance-backed facts, explicit revision history, and
honest abstention when the evidence isn't there.

## Features

Thred exposes a small MCP toolset — use the same memory from any agent client:

| Tool                | What it does                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `thread_remember`   | Saves a durable, evidence-backed fact, decision, lesson, architecture choice, or preference. |
| `thread_context`    | Retrieves verified long-term context relevant to a question.                                 |
| `thread_history`    | Shows the chronological revision history for a fact or entity.                               |
| `thread_inspect`    | Traverses a memory’s provenance and graph relationships.                                     |
| `thread_checkpoint` | Saves coding progress and extracts durable long-term memory from a session.                  |
| `thread_resume`     | Restores the latest unfinished coding checkpoint with relevant context.                      |

Save "we chose PostgreSQL" in one session. Update to "we chose Neon Postgres" in
another. Ask what’s true now — or why it changed — in a third. Nothing gets
silently erased.

## Quick start

### 1. Connect an MCP client

Create an agent key at [thred.fun](https://www.thred.fun), then add this to
Cursor, Claude Code, Codex, or OpenCode:

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

Use the same key across clients to share one workspace memory.

### 2. Run locally (optional)

```bash
npm install
npm run db:generate --workspace=@repo/db
npm run db:migrate --workspace=@repo/db
npm run dev
```

**Prerequisites:** Node.js 18+, PostgreSQL, HydraDB API key, and Groq or OpenAI.

| Variable                                   | Required for                    | Notes                                             |
| ------------------------------------------ | ------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                             | API, frontend, evaluations      | PostgreSQL connection string.                     |
| `HYDRA_DB_API_KEY`                         | API, memory engine, evaluations | HydraDB access token.                             |
| `OPENAI_API_KEY` or `GROQ_API_KEY`         | Extraction and evaluations      | Configure at least one provider.                  |
| `BETTER_AUTH_SECRET`                       | Web authentication              | Signing/encryption secret.                        |
| `BETTER_AUTH_URL`, `FRONTEND_ORIGIN`       | Web authentication              | Local defaults point to `http://localhost:3000`.  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in                  | Required only when Google auth is enabled.        |
| `PORT`, `NEXT_PUBLIC_API_URL`              | Local development               | Optional API port and frontend API URL overrides. |

For MCP clients, configure `THRED_API_KEY`; `THRED_API_URL` defaults to the
production API.

## How it works

1. Agent sessions are processed into atomic, evidence-backed claims.
2. Claims are stored with workspace, session, source-message, entity, and file
   provenance.
3. When a claim changes, Thred writes an explicit `SUPERSEDES` link to the
   prior claim.
4. At query time, hybrid retrieval and graph context surface candidate evidence.
5. A temporal resolver returns current or historical facts as requested.
6. Insufficient evidence → `NOT_FOUND`, not a guess.

Built on [HydraDB](https://github.com/hydra-db/hydradb) for graph-backed storage
with hybrid retrieval — so revision history and provenance are first-class, not
bolted onto a vector store.

## Benchmarks

Evaluated against a hashed-vector RAG baseline on
[LongMemEval](https://github.com/xiaowu0162/LongMemEval),
[LongMemEval V2](https://github.com/xiaowu0162/LongMemEval-V2), and
[BEAM](https://github.com/mohammadtavakoli78/BEAM).

| Evaluation                | Vector-RAG |  Thred | What it demonstrates                                                               |
| ------------------------- | ---------: | -----: | ---------------------------------------------------------------------------------- |
| LongMemEval V2 scale case |     100.0% | 100.0% | Correct temporal answer across 44 sessions / ~128K tokens; zero evaluation errors. |

Full reports in [`apps/evals/reports`](apps/evals/reports).

```bash
npm test
```

Or run individual suites:

```bash
npm run test --workspace=@repo/evals
npm run test --workspace=@repo/memory-extractor
npm run test --workspace=@repo/memory-engine
npm run test --workspace=@thred_nick_01/thred-mcp
```

## Tech stack

TypeScript · Node.js · Express · Next.js · React · MCP · HydraDB · Prisma/PostgreSQL · OpenAI/Groq
