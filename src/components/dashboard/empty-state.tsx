import { SearchX } from "lucide-react";

export function EmptyState({ message = "Aucun résultat ne correspond à votre recherche." }: { message?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
      <SearchX className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm font-medium">Aucun résultat</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
