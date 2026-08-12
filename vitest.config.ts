import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: "server-only", replacement: fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
