import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Presence Plus",
    short_name: "Presence Plus",
    description: "Suivi fiable et centralisé des présences académiques.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#111827",
    lang: "fr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
