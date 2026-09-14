import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // an unrelated lockfile sits above this directory, so pin the root explicitly
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

export default config;
