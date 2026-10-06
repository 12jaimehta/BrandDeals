import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next would otherwise write AGENTS.md and CLAUDE.md into the repo.
  agentRules: false,
  // The Instagram login tunnel is a different host from localhost.
  allowedDevOrigins: ["**.trycloudflare.com"],
};

export default nextConfig;
