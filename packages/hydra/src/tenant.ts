import { getHydraClient, hydraWithRetry } from "./client.js";
import type { HydraResponse } from "./types.js";

const databasePrefix = "thred_workspace_";

/** A deterministic database ID guarantees HydraDB isolation per Thred workspace. */
export function workspaceDatabaseId(workspaceId: string): string {
  const normalizedWorkspaceId = workspaceId.trim();

  if (!normalizedWorkspaceId) {
    throw new Error("workspaceId is required to access HydraDB");
  }

  return `${databasePrefix}${normalizedWorkspaceId}`;
}

/**
 * Provisions a workspace's HydraDB database. Database creation is asynchronous;
 * callers should check status before the first ingest.
 */
export async function provisionWorkspaceDatabase(workspaceId: string): Promise<HydraResponse> {
  return hydraWithRetry(() => getHydraClient().databases.create({
    database: workspaceDatabaseId(workspaceId),
  }), "provision");
}

export async function getWorkspaceDatabaseStatus(workspaceId: string): Promise<HydraResponse> {
  return hydraWithRetry(() => getHydraClient().databases.status({
    database: workspaceDatabaseId(workspaceId),
  }), "status");
}
