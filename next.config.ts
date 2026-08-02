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

const nextConfig: NextConfig = {
  allowedDevOrigins: configuredDevOrigins?.length
    ? configuredDevOrigins
    : [...new Set(["127.0.0.1", "localhost", ...localNetworkOrigins])],
};

export default nextConfig;
