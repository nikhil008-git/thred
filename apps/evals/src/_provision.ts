import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { provisionWorkspaceDatabase, getWorkspaceDatabaseStatus } from "@repo/hydra";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(sourceDirectory, "../../../.env") });

const workspace = "cmswrredi0000bi8og56van9r";
try {
  await provisionWorkspaceDatabase(workspace);
  console.log("provision requested");
} catch (e: any) {
  console.log("provision skipped:", e?.message ?? e);
}
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const status = await getWorkspaceDatabaseStatus(workspace);
    const ready = Boolean((status.data as any)?.infra?.readyForIngestion);
    console.log(`attempt ${attempt}: ${JSON.stringify(status.data ?? status)}`);
    if (ready) break;
  } catch (e: any) {
    console.log(`attempt ${attempt}: error ${e?.message}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
