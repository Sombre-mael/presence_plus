"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EntityDialog({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: Array<{ name: string; label: string; placeholder: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          {fields.map((field) => (
            <div className="space-y-2" key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input id={field.name} name={field.name} placeholder={field.placeholder} required />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit">Ajouter à la démo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
