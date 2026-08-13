import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const configuredDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localNetworkOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((network): network is NonNullable<typeof network> => Boolean(network))
  .filter((network) => network.family === "IPv4" && !network.internal)
  .map((network) => network.address);

if (process.env.VERCEL_ENV === "production") {
  const requiredAuthVariables = ["AUTH_SECRET", "NEXTAUTH_URL", "RESEND_API_KEY", "AUTH_EMAIL_FROM"];
  const missing = requiredAuthVariables.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Configuration Auth de production incomplète : ${missing.join(", ")}`);
  if (process.env.AUTH_EMAIL_MODE === "mock") throw new Error("AUTH_EMAIL_MODE=mock est interdit en production.");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: configuredDevOrigins?.length
    ? configuredDevOrigins
    : [...new Set(["127.0.0.1", "localhost", ...localNetworkOrigins])],
  async headers() {
    return [{
      source: "/(activate-account|reset-password|forgot-password)",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }];
  },
};

export default nextConfig;
