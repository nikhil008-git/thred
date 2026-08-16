# Thred architecture

## Product statement

**Thred is shared temporal memory and coding continuity for AI agents, delivered through MCP.**

Claude, Codex, Cursor, and other MCP clients use one workspace-scoped memory
system. Thred lets a new agent continue unfinished coding work while also
answering what has been learned across a long sequence of sessions.

The Track 03 requirement is the foundation, not a side feature: Thred must
support cross-session retrieval, chronology, updated and overwritten facts,
provenance, missing-information detection, correct abstention, explicit graph
relationships, and realistic read/write cost measurement.

```
Claude / Codex / Cursor
           │ MCP
           ▼
        Thred
  ┌────────┴─────────┐
  │ working memory   │  Where did work stop?
  │ long-term memory │  What do we know now?
  └────────┬─────────┘
           ▼
        HydraDB
```

## Two memory layers

### Working memory: coding continuity

Working memory is the current, resumable state of a task. It includes the
goal, plan/progress, files touched, test failures, observations, next step,
and originating agent/session. It powers a handoff such as Claude closing and
Codex continuing the same task.

Example checkpoint:

```json
{
  "task": "Fix refresh token authentication",
  "status": "IN_PROGRESS",
  "filesTouched": ["auth.ts", "token.ts"],
  "failedTests": ["refresh-token.test.ts"],
  "observation": "Redis TTL may be incorrect",
  "nextStep": "Inspect Redis expiry logic"
}
```

Thred provides continuity; the Git repository remains the source of truth for
code.

### Long-term memory: temporal knowledge

Long-term memory contains durable facts, decisions, events, preferences,
architecture, revisions, chronology, and evidence extracted from sessions. It
must resolve the *current* answer while retaining prior answers and why they
changed.

For example: `MongoDB → PostgreSQL → SQLite → PostgreSQL (current)` is not a
set of disconnected facts. It is a time-ordered revision history.

## Storage boundary

| Store | Responsibility |
| --- | --- |
| PostgreSQL + Prisma | Product metadata: Better Auth records, workspaces, memberships, API keys, agent connections, lightweight agent-session metadata, eval runs/results. |
| HydraDB | Thred's memory brain: extracted memories, entities, facts, decisions, temporal/revision graph, provenance, checkpoints, task state, and retrieval traversal. |

Memory, Fact, Decision, Revision, and Checkpoint are deliberately **not**
Prisma models. They belong in HydraDB.

## Product metadata schema

Better Auth owns `User`, `Session`, `Account`, and `Verification`. Thred adds:

- `Workspace` and `WorkspaceMember`
- `ApiKey` (store only a hash and key prefix)
- `AgentConnection` — a named Claude/Codex/Cursor connection per workspace
- `AgentSession` — agent, external/Hydra session IDs, counts, start/end times
- `EvalRun` and `EvalCaseResult`

`AgentSession` is a source/provenance record; a raw session is not itself a
memory.

## HydraDB graph

Primary nodes include `Workspace`, `Agent`, `Session`, `Memory`, `Entity`,
`Decision`, `Fact`, `Task`, `Checkpoint`, `File`, `Test`, and `Error`.

Core edges include:

`FROM_SESSION`, `ABOUT`, `SUPERSEDES`, `CONTRADICTS`, `SUPPORTS`,
`RELATED_TO`, `CREATED_BY`, `BELONGS_TO`, `TOUCHED_FILE`, `FAILED_TEST`,
`NEXT_STEP`, and `CHECKPOINT_OF`.

Every memory is workspace-scoped and carries provenance: source session,
source content/reference, timestamps, confidence, extraction metadata, and
revision status.

```text
MongoDB ──SUPERSEDED_BY──> PostgreSQL

Task: Fix authentication
  ├─ TOUCHED_FILE ───────> auth.ts
  ├─ TOUCHED_FILE ───────> token.ts
  ├─ FAILED_TEST ────────> refresh-token.test.ts
  ├─ OBSERVED ───────────> Redis TTL may be incorrect
  └─ NEXT_STEP ──────────> Inspect Redis expiry logic
```

## Memory write pipeline

```text
conversation / agent event
  → structured LLM extraction
  → entity resolution
  → revision resolution
  → HydraDB graph write
```

The extractor produces claims, not memory itself. A claim contains subject,
predicate, value, kind, operation (`CREATE`, `UPDATE`, or `RETRACT`),
confidence, and source-session provenance. Before a new assertion is written,
the revision resolver queries current matching facts. A genuine replacement
creates an explicit `SUPERSEDES` relationship instead of overwriting history.

## Context retrieval and abstention

`thread_context` combines semantic candidates, entity/graph traversal,
temporal/revision resolution, provenance ranking, and an abstention gate. It
returns current valid knowledge, relevant history, supporting evidence, and a
confidence score.

When support is insufficient, Thred returns `NOT_FOUND`; it never invents a
plausible answer. Example: a question about a Stripe plan with no evidence
must return no answer and no fabricated plan.

## MCP surface

One Thread MCP server exposes exactly these initial tools:

| Tool | Purpose |
| --- | --- |
| `thread_remember` | Persist a durable fact or decision. |
| `thread_context` | Retrieve task/question-relevant long-term memory. |
| `thread_history` | Show how an entity/fact changed over time. |
| `thread_inspect` | Show evidence and provenance for a memory. |
| `thread_checkpoint` | Save the current coding/working state. |
| `thread_resume` | Restore the latest checkpoint plus relevant long-term memory. |

An MCP client authenticates with a workspace API key (`thrd_sk_…`). The API
verifies its hash, determines the workspace, and scopes all HydraDB reads and
writes to that workspace.

## API and application layout

```text
apps/web       Next.js product UI
apps/api       Express API: auth, workspaces, API keys, sessions, memory,
               context, checkpoints, graph, evals
apps/mcp       MCP server/client and six tools
apps/evals     dataset adapters, baseline and Thread runners, metrics

packages/db              Prisma/Postgres client and schema
packages/auth            Better Auth server/client
packages/hydra           HydraDB client, write, query, graph adapters
packages/memory          extractor, resolver, graph builder, context/ranking,
                         abstention
packages/working-memory  checkpoint, resume, resolver
packages/shared          shared contracts/types
packages/ui              shared UI
```

The Next.js workspace routes are:

```text
/w/[workspace]             overview
/w/[workspace]/sessions
/w/[workspace]/memories
/w/[workspace]/graph
/w/[workspace]/playground
/w/[workspace]/evals
/w/[workspace]/connect
/w/[workspace]/settings
```

## Evaluation contract

Thred is evaluated against a vector-RAG baseline using the same answer model;
only retrieval/memory strategy changes. Dataset adapters cover LongMemEval,
LongMemEval V2, and BEAM.

Report cross-session accuracy, temporal reasoning, revision/overwritten-fact
accuracy, abstention quality, total/read/write tokens, and p50/p95 latency.
The product must demonstrate an ingestion and retrieval flow across roughly
30–40 sessions / ~115k tokens per question, rather than relying on a long
context dump.

## Demo acceptance flow

1. Sign in, create a workspace, and generate an API key.
2. Connect Claude through Thread MCP.
3. Save a database decision, then update it from MongoDB to PostgreSQL; show
   the `SUPERSEDED_BY` graph and historical answer.
4. Save a coding checkpoint with files, failure, observation, and next step.
5. Start a fresh Codex session and call `thread_resume`.
6. Ask an unsupported question and show `NOT_FOUND`.
7. Show Thread versus vector-RAG results and costs in Evals.

## Non-goals

Do not spend build time on billing, broad enterprise permissions, a mobile app,
a full IDE, a custom coding agent, or extensive analytics. The priority is a
complete, graph-native, measurable memory engine with a convincing agent
handoff experience.

## Build order

1. Workspace, auth, API keys, and session metadata.
2. HydraDB adapter and workspace scoping.
3. Claim schema, extraction, entity/revision resolution, and graph writes.
4. Context builder, ranking, provenance, and abstention.
5. Checkpoint/resume working memory.
6. MCP server and six tools.
7. Baseline and Thread evaluation runners/metrics.
8. Workspace UI, demo, setup guide, open-source license, and short video.

## Why HydraDB is essential

Without HydraDB, Thred loses its connected temporal memory graph, revision
history, provenance traversal, and cross-session context resolution. A vector
store alone cannot express or resolve the product's central promise.
