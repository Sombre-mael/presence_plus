import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthSessionProvider } from "@/components/auth/session-provider";

export const metadata: Metadata = {
  title: "Presence Plus",
  description: "Plateforme de suivi des présences pour les établissements.",
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
      </body>
    </html>
  );
}
