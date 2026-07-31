"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY = 4000;

const steps = [
  {
    id: "create",
    number: "01",
    label: "Créer",
    title: "Préparez la session",
    description: "Le cours, l’horaire et la salle sont réunis dans une session prête à accueillir les pointages.",
    accent: "text-emerald-300",
    icon: CalendarPlus,
  },
  {
    id: "check-in",
    number: "02",
    label: "Pointer",
    title: "Collectez les présences",
    description: "Le pointage avance en direct pendant que chaque participation rejoint automatiquement la session.",
    accent: "text-amber-300",
    icon: UserCheck,
  },
  {
    id: "report",
    number: "03",
    label: "Consulter",
    title: "Retrouvez un suivi clair",
    description: "Les résultats sont immédiatement lisibles et prêts à être consultés ou exportés.",
    accent: "text-sky-300",
    icon: BarChart3,
  },
] as const;

function StageVisual({ activeIndex, reducedMotion }: { activeIndex: number; reducedMotion: boolean }) {
  if (activeIndex === 0) {
    return (
      <div className="grid h-full content-center gap-3 sm:grid-cols-[1fr_0.78fr]">
        <div className="border border-white/12 bg-white/7 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-white/55">Nouvelle session</span>
            <span className="bg-emerald-300/15 px-2 py-1 text-xs text-emerald-200">Prête</span>
          </div>
          <p className="font-medium text-white">Algorithmique avancée</p>
          <p className="mt-1 text-sm text-white/55">INF204 · L2 Informatique</p>
          <div className="mt-5 grid gap-3 text-xs text-white/70 sm:grid-cols-2">
            <span className="flex items-center gap-2"><Clock3 className="size-3.5 text-emerald-300" /> 08:00 - 10:00</span>
            <span className="flex items-center gap-2"><MapPin className="size-3.5 text-emerald-300" /> Salle B12</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["48", "participants"],
            ["2 h", "durée prévue"],
            ["1", "session active"],
            ["B12", "salle"],
          ].map(([value, label], index) => (
            <motion.div
              key={label}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : index * 0.08 }}
              className="flex min-h-20 flex-col justify-center border border-white/12 bg-white/7 p-3"
            >
              <span className="metric-number text-lg font-semibold text-white">{value}</span>
              <span className="mt-1 text-xs text-white/50">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (activeIndex === 1) {
    const people = [
      ["Sarah Mbuyi", "08:02", "Présente"],
      ["David Kalala", "08:07", "Présent"],
      ["Naomi Kanku", "08:09", "Présente"],
    ];

    return (
      <div className="grid h-full content-center gap-4 sm:grid-cols-[0.62fr_1fr] sm:items-center">
        <div className="mx-auto bg-white p-3">
          <QRCodeSVG value="PP-SESSION-001" size={118} level="H" marginSize={1} />
          <p className="metric-number mt-2 text-center text-[10px] font-semibold text-slate-900">PP-SESSION-001</p>
        </div>
        <div>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="metric-number text-2xl font-semibold text-white">36 / 48</p>
              <p className="text-xs text-white/50">présences confirmées</p>
            </div>
            <span className="text-xs text-amber-200">En direct</span>
          </div>
          <div className="space-y-2">
            {people.map(([name, time, status], index) => (
              <motion.div
                key={name}
                initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reducedMotion ? 0 : index * 0.16 }}
                className="flex items-center gap-3 border border-white/12 bg-white/7 p-2.5"
              >
                <span className="flex size-7 shrink-0 items-center justify-center bg-amber-300/15 text-amber-200">
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-white">{name}</span>
                <span className="metric-number text-xs text-white/45">{time}</span>
                <span className="sr-only">{status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const bars = [72, 88, 81, 94, 86];

  return (
    <div className="grid h-full content-center gap-4 sm:grid-cols-[1fr_0.72fr]">
      <div className="border border-white/12 bg-white/7 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50">Présence cette semaine</p>
            <p className="metric-number mt-1 text-2xl font-semibold text-white">86%</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-sky-200">
            <BarChart3 className="size-3.5" /> À jour
          </span>
        </div>
        <div className="mt-6 flex h-24 items-end gap-2">
          {bars.map((height, index) => (
            <div key={index} className="flex h-full flex-1 items-end bg-white/5">
              <motion.div
                initial={reducedMotion ? false : { height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.08 }}
                className="w-full bg-sky-300/80"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <div className="border border-white/12 bg-white/7 p-4">
          <Users className="size-4 text-sky-300" />
          <p className="metric-number mt-3 text-xl font-semibold text-white">1 284</p>
          <p className="mt-1 text-xs text-white/50">pointages centralisés</p>
        </div>
        <div className="flex items-center gap-3 border border-white/12 bg-white/7 p-4">
          <FileText className="size-4 text-sky-300" />
          <div>
            <p className="text-sm font-medium text-white">Rapport disponible</p>
            <p className="mt-0.5 text-xs text-white/50">Prêt à consulter</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnimatedWorkflow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const activeStep = steps[activeIndex];
  const ActiveIcon = activeStep.icon;

  useEffect(() => {
    function handleVisibilityChange() {
      setPageVisible(document.visibilityState === "visible");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused || shouldReduceMotion || !pageVisible) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [activeIndex, pageVisible, paused, shouldReduceMotion]);

  function selectStep(index: number) {
    setActiveIndex(index);
  }

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + steps.length) % steps.length);
  }

  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="relative overflow-hidden bg-[#12332c] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="mx-auto grid min-h-[360px] w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:py-8">
        <div className="relative z-10">
          <p className={cn("mb-3 flex items-center gap-2 text-xs font-semibold uppercase", activeStep.accent)}>
            <ActiveIcon className="size-4" />
            Étape {activeStep.number}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeStep.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
              aria-live="polite"
            >
              <h2 id="workflow-title" className="text-2xl font-semibold tracking-normal sm:text-3xl">{activeStep.title}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/65 sm:text-base">{activeStep.description}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => move(-1)}
              aria-label="Étape précédente"
            >
              <ChevronLeft />
            </Button>
            <div className="flex flex-1 gap-2" aria-label="Étapes du parcours">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => selectStep(index)}
                  aria-label={`Afficher l’étape ${index + 1} : ${step.label}`}
                  aria-current={index === activeIndex ? "step" : undefined}
                  className="group relative h-10 flex-1 border-t border-white/20 pt-2 text-left text-xs text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <span className={cn(index === activeIndex && "text-white")}>{step.label}</span>
                  {index === activeIndex && (
                    <motion.span
                      key={`${step.id}-${activeIndex}`}
                      className="absolute -top-px left-0 h-px bg-white"
                      initial={{ width: shouldReduceMotion ? "100%" : "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: shouldReduceMotion || paused ? 0 : AUTOPLAY_DELAY / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => move(1)}
              aria-label="Étape suivante"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="relative z-10 min-h-[250px] border-l border-white/10 pl-0 lg:pl-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeStep.id}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.32 }}
              className="h-full"
            >
              <StageVisual activeIndex={activeIndex} reducedMotion={shouldReduceMotion} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
