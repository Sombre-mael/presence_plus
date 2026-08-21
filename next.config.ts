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

const releaseVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  `build-${Date.now()}`;

if (process.env.VERCEL_ENV === "production") {
  const requiredProductionVariables = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_URL",
    "AUTH_EMAIL_MODE",
    "BLOB_READ_WRITE_TOKEN",
  ];
  const missing = requiredProductionVariables.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Configuration de production incomplète : ${missing.join(", ")}`);
  if (!["live", "manual"].includes(process.env.AUTH_EMAIL_MODE ?? "")) {
    throw new Error("AUTH_EMAIL_MODE doit valoir live ou manual en production.");
  }
  if (!process.env.NEXTAUTH_URL?.startsWith("https://")) throw new Error("NEXTAUTH_URL doit utiliser HTTPS en production.");
  if (process.env.AUTH_EMAIL_MODE === "live") {
    const provider = process.env.AUTH_EMAIL_PROVIDER?.trim().toLocaleLowerCase();
    if (!provider || !["brevo", "resend"].includes(provider)) {
      throw new Error("AUTH_EMAIL_PROVIDER doit valoir brevo ou resend lorsque l’envoi est actif.");
    }
    const requiredEmailVariables = provider === "brevo"
      ? ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME"]
      : ["RESEND_API_KEY", "AUTH_EMAIL_FROM"];
    const missingEmailVariables = requiredEmailVariables.filter((name) => !process.env[name]?.trim());
    if (missingEmailVariables.length) {
      throw new Error(`Configuration ${provider === "brevo" ? "Brevo" : "Resend"} incomplète : ${missingEmailVariables.join(", ")}`);
    }
    if (provider === "resend" && process.env.AUTH_EMAIL_FROM?.includes("example.com")) {
      throw new Error("AUTH_EMAIL_FROM doit utiliser un domaine d’envoi vérifié.");
    }
  }
  const pushVariables = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  const configuredPushVariables = pushVariables.filter((name) => process.env[name]?.trim());
  if (configuredPushVariables.length > 0 && configuredPushVariables.length !== pushVariables.length) {
    throw new Error("La configuration Web Push doit fournir la clé VAPID publique, la clé privée et le sujet.");
  }
  if (
    process.env.VAPID_SUBJECT
    && !process.env.VAPID_SUBJECT.startsWith("mailto:")
    && !process.env.VAPID_SUBJECT.startsWith("https://")
  ) {
    throw new Error("VAPID_SUBJECT doit utiliser mailto: ou https://.");
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: releaseVersion,
  },
  allowedDevOrigins: configuredDevOrigins?.length
    ? configuredDevOrigins
    : [...new Set(["127.0.0.1", "localhost", ...localNetworkOrigins])],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=()" },
        ],
      },
      {
        source: "/(activate-account|reset-password|forgot-password)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
