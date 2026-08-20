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
  descriptionId?: string;
  onValueChange?: (value: string) => void;
}

export function PasswordInput({ id, name, label, autoComplete, error, disabled, descriptionId, onValueChange }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const describedBy = [error ? `${id}-error` : undefined, descriptionId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={describedBy} className="h-11 pr-11" disabled={disabled} onChange={(event) => onValueChange?.(event.target.value)} />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{visible ? <EyeOff /> : <Eye />}</Button>
      </div>
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function NewPasswordInput({ error, disabled }: { error?: string; disabled?: boolean }) {
  const [password, setPassword] = useState("");
  const result = evaluatePassword(password);
  const level = result.score < 2 ? 1 : result.score === 2 ? 2 : 3;
  const strength = level === 1 ? "Trop facile" : level === 2 ? "Acceptable" : "Solide";
  return (
    <div className="space-y-2">
      <PasswordInput id="password" name="password" label="Nouveau mot de passe" autoComplete="new-password" error={error} disabled={disabled} descriptionId="password-guidance" onValueChange={setPassword} />
      <div id="password-guidance" className="space-y-1.5 text-xs text-muted-foreground" aria-live="polite">
        <div className="grid grid-cols-3 gap-1" aria-hidden="true">
          {[1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full ${password && item <= level ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <p>{password ? `Niveau : ${strength}. ` : ""}Utilisez une phrase de 12 caractères ou plus, facile à retenir.</p>
      </div>
    </div>
  );
}
