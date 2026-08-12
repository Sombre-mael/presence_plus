import { assertE2EDatabase, assertFixedDemoProfiles, cleanupAllE2EData, createE2EPool, saveFixedDemoProfileFingerprint } from "./database";

export default async function globalSetup() {
  const pool = createE2EPool();
  try {
    await assertE2EDatabase(pool);
    await assertFixedDemoProfiles(pool);
    await saveFixedDemoProfileFingerprint(pool);
  } finally {
    await pool.end();
  }
  await cleanupAllE2EData();
}
