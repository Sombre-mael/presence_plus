import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { PwaRegistration } from "@/components/pwa/pwa-registration";
import { getAppVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Presence Plus",
  description: "Plateforme de suivi des présences pour les établissements.",
  applicationName: "Presence Plus",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Presence Plus",
  },
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full font-sans">
      <body className="min-h-full">
        <AuthSessionProvider><TooltipProvider>{children}</TooltipProvider></AuthSessionProvider>
        <PwaRegistration currentVersion={getAppVersion()} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
