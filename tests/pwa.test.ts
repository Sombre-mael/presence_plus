import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { GET as getVersion } from "@/app/api/version/route";
import { GET as getWorker } from "@/app/sw.js/route";

describe("PWA versionnée", () => {
  it("conserve une identité d’installation stable", () => {
    const value = manifest();
    expect(value).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone" });
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
    ]));
  });

  it("sert la version et le worker sans cache", async () => {
    const versionResponse = await getVersion();
    const workerResponse = await getWorker();
    const worker = await workerResponse.text();

    expect(versionResponse.headers.get("cache-control")).toContain("no-store");
    expect(workerResponse.headers.get("cache-control")).toContain("no-store");
    expect(workerResponse.headers.get("service-worker-allowed")).toBe("/");
    expect(worker).toContain("SKIP_WAITING");
    expect(worker).toContain("APP_VERSION");
    expect(worker).not.toContain('addEventListener("fetch"');
  });

  it("enregistre le worker à la racine sans cache intermédiaire", async () => {
    const source = await readFile(new URL("../src/components/pwa/pwa-registration.tsx", import.meta.url), "utf8");
    expect(source).toContain('register("/sw.js", { scope: "/", updateViaCache: "none" })');
    expect(source).toContain('type: "SKIP_WAITING"');
    expect(source).toContain('addEventListener("controllerchange"');
  });
});
