import { Suspense } from "react";
import { CoursesManager } from "@/components/admin/entity-managers";

export default function AdminCoursesPage() {
  return <Suspense><CoursesManager /></Suspense>;
}
