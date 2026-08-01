"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Expand, Printer, QrCode, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getQrTokenAction } from "@/actions/academic.actions";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function QrPanel({ sessionId }: { sessionId: string }) {
  const { state, viewerId } = useAcademicData();
  const session = state.sessions.find((item) => item.id === sessionId && item.teacherId === viewerId);
  const panelRef = useRef<HTMLDivElement>(null);
  const expiresRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<{ value: string; expiresAt: number; payload: string }>();

  useEffect(() => {
    if (session?.status !== "ACTIVE") return;
    let cancelled = false;
    async function refresh() {
      const result = await getQrTokenAction(sessionId);
      if (!cancelled && result.ok) {
        expiresRef.current = result.expiresAt;
        setToken({ value: result.token, expiresAt: result.expiresAt, payload: result.payload });
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresRef.current) void refresh();
    }, 1_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.status, sessionId]);

  if (!session) return <p className="py-16 text-center text-sm text-muted-foreground">Session introuvable.</p>;
  if (session.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-xl border border-dashed bg-background p-8 text-center">
        <QrCode className="mx-auto size-7 text-muted-foreground" />
        <h2 className="mt-4 font-semibold">QR code indisponible</h2>
        <p className="mt-2 text-sm text-muted-foreground">Le pointage est accessible uniquement pendant une session active.</p>
        <div className="mt-5"><StatusBadge status={session.status} /></div>
        <Button asChild variant="outline" className="mt-5"><Link href={`/teacher/sessions/${sessionId}`}>Retour à la session</Link></Button>
      </div>
    );
  }
  if (!token) return <p className="py-16 text-center text-sm text-muted-foreground">Génération sécurisée du QR…</p>;

  const seconds = Math.max(0, Math.ceil((token.expiresAt - now) / 1_000));

  async function copyCode() {
    await navigator.clipboard?.writeText(token!.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function project() {
    await panelRef.current?.requestFullscreen?.();
  }

  return (
    <div ref={panelRef} className="mx-auto max-w-4xl bg-background p-4 text-center sm:p-6 fullscreen:flex fullscreen:max-w-none fullscreen:flex-col fullscreen:items-center fullscreen:justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2"><StatusBadge status="ACTIVE" /><span className="text-xs text-muted-foreground">Code renouvelé automatiquement</span></div>
      <div className="mx-auto mt-6 w-fit bg-white p-5 ring-1 ring-border sm:p-7">
        <QRCodeSVG value={token.payload} size={280} level="H" marginSize={1} className="h-auto w-[min(70vw,320px)]" />
      </div>
      <p className="metric-number mt-6 text-2xl font-semibold tracking-normal">{token.value}</p>
      <div className="mx-auto mt-3 max-w-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Nouveau code dans</span><span className="metric-number font-semibold text-foreground">{seconds}s</span></div>
        <div className="mt-2 h-1.5 bg-muted"><div className="h-full bg-primary transition-[width] duration-1000" style={{ width: `${seconds / 30 * 100}%` }} /></div>
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">Les étudiants peuvent scanner le QR ou saisir le code affiché. Chaque code est signé et validé par le serveur.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
        <Button variant="outline" onClick={copyCode}>{copied ? <Check /> : <Copy />}{copied ? "Copié" : "Copier le code"}</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Imprimer</Button>
        <Button variant="outline" onClick={project}><Expand /> Projeter</Button>
        <Button asChild><Link href={`/teacher/sessions/${sessionId}/attendances`}><Users /> Présences</Link></Button>
      </div>
    </div>
  );
}
