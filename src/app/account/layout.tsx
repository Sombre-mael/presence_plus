import type { ReactNode } from "react";
import { AccountNavigation } from "@/components/account/account-navigation";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <AccountNavigation />
        {children}
      </div>
    </main>
  );
}
