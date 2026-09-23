"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { isPublicTelemetryUrl } from "@/lib/analytics-privacy";

export function PrivacyAwareTelemetry() {
  return (
    <>
      <Analytics beforeSend={(event) => isPublicTelemetryUrl(event.url, window.location.origin) ? event : null} />
      <SpeedInsights beforeSend={(event) => isPublicTelemetryUrl(event.url, window.location.origin) ? event : null} />
    </>
  );
}
