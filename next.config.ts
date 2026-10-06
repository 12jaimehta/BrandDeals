import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next would otherwise write AGENTS.md and CLAUDE.md into the repo.
  agentRules: false,
  // 127.0.0.1 is the X callback host. The Cloudflare host is the Instagram login tunnel.
  allowedDevOrigins: ["127.0.0.1", "**.trycloudflare.com"],
};

export default nextConfig;
