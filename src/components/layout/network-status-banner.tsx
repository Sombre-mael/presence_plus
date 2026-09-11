"use client";

import { useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function NetworkStatusBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <div className="print:hidden border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950" role="status"><CloudOff className="mr-2 inline size-4" />Connexion interrompue. La consultation reste affichée, mais tout pointage doit être confirmé en ligne.</div>;
}
