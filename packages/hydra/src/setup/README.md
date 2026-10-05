# setup

Connection and workspace isolation. Used by both write and read.

| File | TLDR |
|---|---|
| `client.ts` | Hydra SDK. Product retries stop after 30s. Eval runs (`HYDRA_LONG_RETRY=1`) keep the long budget. |
| `tenant.ts` | Database name `thred_workspace_<id>`, plus create/status. |
