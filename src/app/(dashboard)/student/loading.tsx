import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <div className="space-y-6" aria-label="Chargement de l’espace étudiant">
      <div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-full max-w-lg" /></div>
      <div className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="space-y-3 bg-background p-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32" /></div>)}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" /></div>
    </div>
  );
}
