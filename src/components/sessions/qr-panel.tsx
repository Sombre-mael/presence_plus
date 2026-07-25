"use client";

import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QrPanel({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const code = `PP-${sessionId.toUpperCase()}`;

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="mx-auto max-w-lg print:ring-0">
      <CardContent className="flex flex-col items-center py-5 text-center">
        <div className="bg-white p-5 ring-1 ring-border">
          <QRCodeSVG value={code} size={240} level="H" marginSize={1} />
        </div>
        <p className="metric-number mt-5 text-lg font-semibold">{code}</p>
        <p className="mt-1 text-sm text-muted-foreground">Les étudiants peuvent scanner ce code ou le saisir manuellement.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <Button variant="outline" onClick={copyCode}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copié" : "Copier le code"}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Imprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
