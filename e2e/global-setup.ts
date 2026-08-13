import { assertE2EDatabase, assertFixedDemoProfiles, cleanupAllE2EData, createE2EPool, prepareFixedAuthProfiles } from "./database";

export default async function globalSetup() {
  await cleanupAllE2EData();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const pool = createE2EPool();
    try {
      await assertE2EDatabase(pool);
      await assertFixedDemoProfiles(pool);
      await prepareFixedAuthProfiles(pool);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
  throw lastError;
}
