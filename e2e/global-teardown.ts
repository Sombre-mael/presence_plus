import { unlink } from "node:fs/promises";
import { assertE2EDatabase, cleanupAllE2EData, createE2EPool, restoreFixedAuthProfiles } from "./database";

export default async function globalTeardown() {
  let cleanupError: unknown;
  try {
    await cleanupAllE2EData().catch((error) => { cleanupError = error; });
    const pool = createE2EPool();
    try {
      await assertE2EDatabase(pool);
      await restoreFixedAuthProfiles(pool);
    } finally {
      await pool.end();
    }
  } finally {
    await unlink(".e2e-demo-profiles.json").catch(() => undefined);
  }
  if (cleanupError) throw cleanupError;
}
