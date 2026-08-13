"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluatePassword } from "@/lib/password-policy";

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export function PasswordInput({ id, name, label, autoComplete, error, disabled, onValueChange }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-11 pr-11" disabled={disabled} onChange={(event) => onValueChange?.(event.target.value)} />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{visible ? <EyeOff /> : <Eye />}</Button>
      </div>
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function NewPasswordInput({ error, disabled }: { error?: string; disabled?: boolean }) {
  const [password, setPassword] = useState("");
  const result = evaluatePassword(password);
  const strength = ["Très faible", "Faible", "Moyenne", "Bonne", "Forte"][result.score];
  return (
    <div className="space-y-2">
      <PasswordInput id="password" name="password" label="Nouveau mot de passe" autoComplete="new-password" error={error} disabled={disabled} onValueChange={setPassword} />
      <p className="text-xs text-muted-foreground" aria-live="polite">Force : {password ? strength : "non évaluée"}. 12 à 64 caractères, difficile à deviner et sans information personnelle.</p>
    </div>
  );
}
