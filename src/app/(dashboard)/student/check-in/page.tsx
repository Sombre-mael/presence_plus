import { CheckInForm } from "@/components/attendances/check-in-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default function StudentCheckInPage() {
  return (
    <div>
      <PageHeader title="Pointer ma présence" description="Scannez le QR code en classe ou saisissez le code de la session." />
      <CheckInForm />
    </div>
  );
}
