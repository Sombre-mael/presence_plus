import "server-only";

import { headers } from "next/headers";

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

function readHeader(source: HeaderSource, name: string) {
  if (!source) return null;
  if (source instanceof Headers) return source.get(name);
  const value = source[name] ?? source[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

export function clientIpFromHeaders(source: HeaderSource) {
  const forwarded = readHeader(source, "x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || readHeader(source, "x-real-ip")?.trim() || "unknown";
}

export async function currentClientIp() {
  return clientIpFromHeaders(await headers());
}
