# setup

Connection and workspace isolation. Used by both write and read.

| File | TLDR |
|---|---|
| `client.ts` | Hydra SDK + `hydraWithRetry` (up to 8 tries). |
| `tenant.ts` | Database name `thred_workspace_<id>`, plus create/status. |
