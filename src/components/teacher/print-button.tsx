"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return <Button className="print:hidden" onClick={() => window.print()}><Printer />Imprimer la feuille</Button>;
}
