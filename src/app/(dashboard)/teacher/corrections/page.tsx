import { Suspense } from "react";
import { CorrectionsManager } from "@/components/teacher/corrections-manager";

export default function TeacherCorrectionsPage() {
  return <Suspense><CorrectionsManager /></Suspense>;
}
