import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presence Plus",
  description: "Plateforme de suivi des presences pour les etablissements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}
