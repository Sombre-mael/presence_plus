import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-[#f4f7f5] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:px-4 sm:py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-4 flex w-fit items-center gap-3 font-semibold sm:mb-7"><span className="flex size-10 items-center justify-center border bg-white"><Image src="/logo.svg" alt="" width={30} height={30} /></span>Presence Plus</Link>
        <section className="rounded-lg border bg-background p-4 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase text-primary">Sécurité du compte</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-5 sm:mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
