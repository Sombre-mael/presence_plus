import { BrandLoader } from "@/components/feedback/brand-loader";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true">
      <div className="flex min-h-16 items-center justify-between border-b pb-4">
        <BrandLoader compact label="Préparation du tableau de bord" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="space-y-3 border p-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
