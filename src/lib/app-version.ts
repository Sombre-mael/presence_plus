import packageJson from "../../package.json";

export function getAppVersion() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    packageJson.version
  );
}
