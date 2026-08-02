import { BrandLoader } from "@/components/feedback/brand-loader";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardRoleLoading({ label }: { label: string }) {
  return (
    <section className="space-y-6" aria-busy="true" aria-label={label}>
      <BrandLoader compact label={label} />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </section>
  );
}
