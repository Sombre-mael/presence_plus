"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BarChart3, Check, QrCode, Sparkles } from "lucide-react";

const steps = [
  {
    label: "Créer",
    detail: "La session est prête",
    icon: Sparkles,
    color: "bg-emerald-300 text-emerald-950",
  },
  {
    label: "Pointer",
    detail: "Les présences arrivent",
    icon: QrCode,
    color: "bg-amber-300 text-amber-950",
  },
  {
    label: "Consulter",
    detail: "Le suivi est disponible",
    icon: BarChart3,
    color: "bg-sky-300 text-sky-950",
  },
] as const;

export function LoginVisual() {
  const reduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    const interval = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % steps.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="w-full max-w-lg" aria-label="Le parcours Presence Plus en trois étapes">
      <div className="mb-6 flex items-center gap-2 text-sm text-white/70">
        <span className="h-px w-8 bg-white/30" />
        Un parcours qui reste simple
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = activeStep === index;
          const isComplete = activeStep > index;

          return (
            <motion.button
              key={step.label}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`relative flex min-h-20 w-full items-center gap-4 overflow-hidden border px-4 text-left transition-colors ${
                isActive
                  ? "border-white/35 bg-white/12"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
              animate={reduceMotion ? undefined : { x: isActive ? 6 : 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              aria-pressed={isActive}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center ${step.color}`}>
                {isComplete ? <Check className="size-5" /> : <step.icon className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{step.label}</span>
                <span className="mt-1 block text-xs text-white/65">{step.detail}</span>
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center border border-white/15 text-xs font-semibold text-white/60">
                0{index + 1}
              </span>

              {isActive && (
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-300"
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 2.5, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 min-h-12 border-l-2 border-emerald-300 pl-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={activeStep}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="text-sm leading-6 text-white/75"
          >
            {activeStep === 0 && "Tout commence par une séance clairement identifiée."}
            {activeStep === 1 && "Chaque participation rejoint la session en cours."}
            {activeStep === 2 && "Les informations utiles sont réunies au même endroit."}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
