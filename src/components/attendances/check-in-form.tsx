"use client";

import { useState } from "react";
import { CheckCircle2, QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = "idle" | "success" | "error";

export function CheckInForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>("idle");

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><QrCode className="size-4 text-primary" /> Code de session</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setResult(code.trim().toUpperCase() === "PP-SESSION-001" ? "success" : "error");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="session-code">Saisissez le code affiché par l’enseignant</Label>
            <Input
              id="session-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setResult("idle");
              }}
              placeholder="PP-SESSION-001"
              className="metric-number uppercase"
              required
            />
          </div>
          <Button type="submit" className="w-full">Confirmer ma présence</Button>
          {result === "success" && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 />
              <AlertTitle>Présence confirmée</AlertTitle>
              <AlertDescription>Algorithmique avancée · 08:02 · Salle B12</AlertDescription>
            </Alert>
          )}
          {result === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Code non reconnu</AlertTitle>
              <AlertDescription>Pour la démo, utilisez PP-SESSION-001.</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
