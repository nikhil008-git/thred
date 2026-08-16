import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const generatedDirectory = path.join(packageDirectory, "generated", "prisma");
const source = path.join(generatedDirectory, "client.ts");
const facade = path.join(generatedDirectory, "client.js");

await access(source);
// Prisma's `prisma-client` generator emits TypeScript. NodeNext callers import
// `.js`, while Next resolves the facade and transpiles the generated source.
await writeFile(facade, 'export * from "./client.ts";\n');
