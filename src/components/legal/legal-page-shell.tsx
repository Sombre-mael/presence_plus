import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LegalLinks } from "@/components/legal/legal-links";

export function LegalPageShell({ title, description, version, children }: { title: string; description: string; version: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f5f7f6]">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold"><Image src="/logo.svg" alt="" width={34} height={34} />Presence Plus</Link>
          <Link href="/" className="flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Retour</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="border-b pb-7">
          <p className="text-xs font-semibold uppercase text-primary">Information juridique</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
          <p className="mt-3 text-xs text-muted-foreground">Version {version} · Entrée en vigueur le 23 septembre 2026</p>
        </div>
        <article className="legal-content py-8 text-sm leading-7 text-foreground sm:text-base">{children}</article>
      </main>
      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground">Équipe Presence Plus · presenceplus12@gmail.com</p>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-8"><h2 className="mb-3 text-xl font-semibold tracking-normal">{title}</h2><div className="space-y-3 text-muted-foreground">{children}</div></section>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-primary">{children}</ul>;
}
