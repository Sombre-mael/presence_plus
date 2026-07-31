"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Keyboard,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import type { CheckInPreview, CheckInValidationResult } from "@/types/student";
import { useAcademicData } from "@/components/admin/admin-data-provider";
import { validateStudentCheckIn } from "@/lib/student-domain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const studentId = "u4";
type FlowState = "idle" | "requesting" | "scanning" | "preview" | "success" | "error";

export function CheckInForm() {
  const { state, submitStudentCheckIn } = useAcademicData();
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<CheckInPreview | null>(null);
  const [message, setMessage] = useState("");
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  function acceptValidation(result: CheckInValidationResult) {
    if (!result.ok) {
      setMessage(result.message);
      setFlow("error");
      return;
    }
    setPreview(result.preview);
    setAlreadyRecorded(result.alreadyRecorded);
    if (result.alreadyRecorded) {
      setMessage("Votre présence est déjà enregistrée pour cette séance.");
      setFlow("success");
    } else {
      setFlow("preview");
    }
  }

  async function startCamera() {
    stopCamera();
    setMessage("");
    setFlow("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera-unavailable");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 800,
      });
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          stopCamera();
          acceptValidation(validateStudentCheckIn(state, result.getText(), studentId, "QR"));
        },
      );
      controlsRef.current = controls;
      setFlow("scanning");
    } catch {
      stopCamera();
      setCameraUnavailable(true);
      setMessage("La caméra est indisponible ou son autorisation a été refusée. Utilisez le code manuel.");
      setFlow("error");
    }
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    acceptValidation(validateStudentCheckIn(state, code, studentId, "STUDENT_CODE"));
  }

  function confirm() {
    if (!preview) return;
    const result = submitStudentCheckIn({ ...preview, confirmedAt: Date.now() });
    if (!result.ok) {
      setMessage(result.message);
      setFlow("error");
      setPreview(null);
      return;
    }
    setAlreadyRecorded(result.alreadyRecorded);
    setMessage(result.alreadyRecorded
      ? "Votre présence était déjà enregistrée."
      : "Votre présence vient d’être enregistrée.");
    setFlow("success");
  }

  function reset() {
    stopCamera();
    setFlow("idle");
    setPreview(null);
    setMessage("");
    setCode("");
    setAlreadyRecorded(false);
  }

  const session = preview ? state.sessions.find((item) => item.id === preview.sessionId) : undefined;
  const attendance = preview ? state.attendances.find(
    (item) => item.sessionId === preview.sessionId && item.studentId === studentId,
  ) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <AnimatePresence mode="wait">
        {flow === "preview" && session && (
          <motion.section key="preview" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="overflow-hidden border bg-background">
            <div className="border-b bg-emerald-50/70 p-5">
              <div className="flex items-center gap-2 text-emerald-800"><ShieldCheck className="size-5" /><span className="text-sm font-semibold">Code vérifié</span></div>
              <h2 className="mt-4 text-xl font-semibold">{session.courseName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{session.courseCode} · {session.promotion}</p>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              <Detail icon={UserRound} label="Enseignant" value={session.teacher} />
              <Detail icon={Clock3} label="Horaire" value={`${session.startTime} – ${session.endTime}`} />
              <Detail icon={MapPin} label="Salle" value={session.room} />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={reset}>Annuler</Button>
              <Button onClick={confirm}><CheckCircle2 /> Confirmer ma présence</Button>
            </div>
          </motion.section>
        )}

        {flow === "success" && (
          <motion.section key="success" initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="border bg-background p-7 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-7" /></span>
            <h2 className="mt-4 text-xl font-semibold">{alreadyRecorded ? "Pointage déjà effectué" : "Présence confirmée"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
            {session && <p className="mt-4 text-sm font-medium">{session.courseName} · {attendance?.checkedInAt ?? "Enregistré"}</p>}
            <Button variant="outline" className="mt-6" onClick={reset}><RefreshCw /> Scanner un autre code</Button>
          </motion.section>
        )}

        {flow !== "preview" && flow !== "success" && (
          <motion.div key="scanner" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
            <Tabs defaultValue="camera" className="flex-col gap-4">
              <TabsList className="mx-auto">
                <TabsTrigger value="camera"><Camera /> Scanner</TabsTrigger>
                <TabsTrigger value="manual"><Keyboard /> Code manuel</TabsTrigger>
              </TabsList>
              <TabsContent value="camera">
                <div className="overflow-hidden border bg-slate-950 text-white">
                  <div className="relative aspect-[4/3] max-h-[520px] w-full">
                    <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                    {flow !== "scanning" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        {cameraUnavailable ? <CameraOff className="size-9 text-white/70" /> : <QrCode className="size-9 text-white/70" />}
                        <p className="mt-4 max-w-sm text-sm text-white/70">Placez le QR code de l’enseignant dans le cadre.</p>
                      </div>
                    )}
                    {flow === "scanning" && <div className="pointer-events-none absolute inset-[12%] border-2 border-white/90"><span className="absolute left-1/2 top-1/2 h-0.5 w-3/4 -translate-x-1/2 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)] motion-safe:animate-pulse" /></div>}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/15 p-4">
                    <p className="text-xs text-white/60">{flow === "scanning" ? "Recherche d’un QR code…" : "La caméra démarre uniquement avec votre accord."}</p>
                    {flow === "scanning" ? <Button variant="secondary" onClick={() => { stopCamera(); setFlow("idle"); }}>Arrêter</Button> : <Button onClick={startCamera} disabled={flow === "requesting"}><Camera /> {flow === "requesting" ? "Ouverture…" : "Ouvrir la caméra"}</Button>}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="manual">
                <form onSubmit={submitCode} className="border bg-background p-5 sm:p-6">
                  <Label htmlFor="student-session-code">Code affiché par l’enseignant</Label>
                  <Input id="student-session-code" value={code} onChange={(event) => { setCode(event.target.value.toLocaleUpperCase("fr")); setMessage(""); setFlow("idle"); }} placeholder="PP-XXXXXXX" className="metric-number mt-2 h-12 text-center text-lg uppercase" required />
                  <Button type="submit" className="mt-4 w-full">Vérifier le code</Button>
                </form>
              </TabsContent>
            </Tabs>
            {flow === "error" && <Alert variant="destructive" className="mt-4"><AlertTitle>Pointage impossible</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Aucune donnée de localisation n’est demandée. Le pointage est lié à votre compte et à votre promotion.</p>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex gap-3 bg-background p-4"><Icon className="size-4 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}
