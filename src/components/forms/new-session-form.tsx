"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { courses, promotions } from "@/lib/mock-data";

export function NewSessionForm() {
  const [created, setCreated] = useState(false);

  return (
    <form
      className="max-w-3xl"
      onSubmit={(event) => {
        event.preventDefault();
        setCreated(true);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Informations de la session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="course">Cours</Label>
            <Select required>
              <SelectTrigger id="course" className="w-full"><SelectValue placeholder="Sélectionner un cours" /></SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.code} · {course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="promotion">Promotion</Label>
            <Select required>
              <SelectTrigger id="promotion" className="w-full"><SelectValue placeholder="Sélectionner une promotion" /></SelectTrigger>
              <SelectContent>
                {promotions.map((promotion) => (
                  <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" defaultValue="2026-07-28" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Salle</Label>
            <Input id="room" placeholder="Ex. B12" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Heure de début</Label>
            <Input id="start" type="time" defaultValue="08:00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Heure de fin</Label>
            <Input id="end" type="time" defaultValue="10:00" required />
          </div>
          {created && (
            <Alert className="sm:col-span-2">
              <CheckCircle2 />
              <AlertTitle>Session préparée</AlertTitle>
              <AlertDescription>La création est simulée; aucune donnée n’a été enregistrée.</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="reset" variant="outline" onClick={() => setCreated(false)}>Réinitialiser</Button>
          <Button type="submit">Créer la session</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
