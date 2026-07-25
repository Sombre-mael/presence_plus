import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SCHEDULED: "Planifiée",
  COMPLETED: "Terminée",
  PRESENT: "Présent",
  LATE: "En retard",
  ABSENT: "Absent",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        ["ACTIVE", "PRESENT"].includes(status) && "border-emerald-200 bg-emerald-50 text-emerald-700",
        ["SCHEDULED"].includes(status) && "border-sky-200 bg-sky-50 text-sky-700",
        ["LATE"].includes(status) && "border-amber-200 bg-amber-50 text-amber-700",
        ["INACTIVE", "ABSENT"].includes(status) && "border-red-200 bg-red-50 text-red-700",
        ["COMPLETED"].includes(status) && "border-neutral-200 bg-neutral-50 text-neutral-600",
      )}
    >
      {labels[status] ?? status}
    </Badge>
  );
}
