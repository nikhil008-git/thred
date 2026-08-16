import { HydraDBClient } from "@hydradb/sdk";

let client: HydraDBClient | undefined;

/**
 * Creates the SDK lazily so importing the package never requires a production
 * secret. This package must only be used in trusted server code.
 */
export function getHydraClient(): HydraDBClient {
  if (client) return client;

  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) throw new Error("HYDRA_DB_API_KEY is required for HydraDB access");

  client = new HydraDBClient({ token, maxRetries: 2, timeoutInSeconds: 30 });
  return client;
}

// sdk ijmplementation from hydra
