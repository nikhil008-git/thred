import { config } from "dotenv";
import type { NextConfig } from "next";
import path from "node:path";

// The monorepo keeps local configuration in its root .env. Next only loads .env
// files in the app directory by default, so load the shared file before auth code
// is evaluated.
config({ path: path.join(__dirname, "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
