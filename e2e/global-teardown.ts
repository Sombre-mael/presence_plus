import { unlink } from "node:fs/promises";
import { assertE2EDatabase, assertFixedDemoProfilesUnchanged, cleanupAllE2EData, createE2EPool } from "./database";

export default async function globalTeardown() {
  try {
    await cleanupAllE2EData();
    const pool = createE2EPool();
    try {
      await assertE2EDatabase(pool);
      await assertFixedDemoProfilesUnchanged(pool);
    } finally {
      await pool.end();
    }
  } finally {
    await unlink(".e2e-demo-profiles.sha256").catch(() => undefined);
  }
}
