"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BookOpen, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useAdminData } from "@/components/admin/admin-data-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminCourse,
  AdminCourseInput,
  AdminPromotion,
  AdminPromotionInput,
  AdminUser,
  AdminUserInput,
  MutationResult,
} from "@/types/admin";
import type { Role, UserStatus } from "@/types";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
};

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function FieldMessage({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-600">{message}</p> : null;
}

function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onDelete,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onDelete: () => MutationResult;
  onDeleted: () => void;
}) {
  const [error, setError] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setError("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Suppression impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
          <Button
            variant="destructive"
            onClick={() => {
              const result = onDelete();
              if (!result.ok) {
                setError(result.message);
                return;
              }
              handleOpenChange(false);
              onDeleted();
            }}
          >
            <Trash2 />
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b py-3 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm font-medium">{children}</span>
    </div>
  );
}

function RowActions({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ouvrir les actions"><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onView}><Eye />Consulter</DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}><Pencil />Modifier</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 />Supprimer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser;
}) {
  const { state, createUser, updateUser } = useAdminData();
  const [role, setRole] = useState<Role>(user?.role ?? "STUDENT");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formKey = `${user?.id ?? "new"}-${open}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: AdminUserInput = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      role,
      status,
      promotionId: role === "STUDENT" ? String(data.get("promotionId") ?? "") : undefined,
      matricule: role === "STUDENT" ? String(data.get("matricule") ?? "") : undefined,
    };
    const result = user ? updateUser(user.id, input) : createUser(input);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? { form: result.message });
      return;
    }
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Modifier l’utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
          <DialogDescription>Les champs affichés s’adaptent au rôle sélectionné.</DialogDescription>
        </DialogHeader>
        <form key={formKey} onSubmit={submit} className="space-y-4">
          {errors.form && <Alert variant="destructive"><AlertDescription>{errors.form}</AlertDescription></Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-name">Nom complet</Label>
              <Input id="user-name" name="name" defaultValue={user?.name} placeholder="Prénom Nom" />
              <FieldMessage message={errors.name} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-email">Adresse e-mail</Label>
              <Input id="user-email" name="email" type="email" defaultValue={user?.email} placeholder="prenom@etablissement.cd" />
              <FieldMessage message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="TEACHER">Enseignant</SelectItem>
                  <SelectItem value="STUDENT">Étudiant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as UserStatus)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="INACTIVE">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "STUDENT" && (
              <>
                <div className="space-y-2">
                  <Label>Promotion</Label>
                  <Select name="promotionId" defaultValue={user?.promotionId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldMessage message={errors.promotionId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-matricule">Matricule</Label>
                  <Input id="user-matricule" name="matricule" defaultValue={user?.matricule} placeholder="INF25-001" />
                  <FieldMessage message={errors.matricule} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{user ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersManager({ initialStatus = "ALL" }: { initialStatus?: string }) {
  const { state, deleteUser } = useAdminData();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState(initialStatus);
  const [selectedId, setSelectedId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selected = state.users.find((user) => user.id === selectedId);
  const editing = state.users.find((user) => user.id === editingId);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return state.users.filter((user) => (
      (!normalized || `${user.name} ${user.email} ${user.matricule ?? ""}`.toLocaleLowerCase("fr").includes(normalized)) &&
      (role === "ALL" || user.role === role) &&
      (status === "ALL" || user.status === status)
    ));
  }, [query, role, state.users, status]);

  function edit(id: string) {
    setEditingId(id);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les accès, rôles et rattachements académiques."
        action={<Button onClick={() => { setEditingId(undefined); setFormOpen(true); }}><Plus />Ajouter un utilisateur</Button>}
      />
      <div className="border bg-background">
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
          <SearchField value={query} onChange={setQuery} placeholder="Nom, e-mail ou matricule..." />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les rôles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les rôles</SelectItem>
              <SelectItem value="ADMIN">Administrateurs</SelectItem>
              <SelectItem value="TEACHER">Enseignants</SelectItem>
              <SelectItem value="STUDENT">Étudiants</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="INACTIVE">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead><TableHead>Promotion</TableHead><TableHead>Statut</TableHead><TableHead className="w-14" /></TableRow></TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const promotion = state.promotions.find((item) => item.id === user.promotionId);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <button className="text-left" onClick={() => setSelectedId(user.id)}>
                        <span className="block font-medium">{user.name}</span>
                        <span className="block text-xs text-muted-foreground">{user.email}</span>
                      </button>
                    </TableCell>
                    <TableCell>{roleLabels[user.role]}</TableCell>
                    <TableCell>{promotion?.name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={user.status} /></TableCell>
                    <TableCell><RowActions onView={() => setSelectedId(user.id)} onEdit={() => edit(user.id)} onDelete={() => { setSelectedId(user.id); setDeleteOpen(true); }} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y md:hidden">
          {filtered.map((user) => (
            <button key={user.id} onClick={() => setSelectedId(user.id)} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="flex size-9 shrink-0 items-center justify-center bg-primary/8 text-primary"><UserRound className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{roleLabels[user.role]} · {user.email}</span>
              </span>
              <StatusBadge status={user.status} />
            </button>
          ))}
        </div>
        {!filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur ne correspond aux filtres.</p>}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{roleLabels[selected.role]} · compte créé le {new Date(selected.createdAt).toLocaleDateString("fr-FR")}</SheetDescription>
              </SheetHeader>
              <div className="px-4">
                <DetailLine label="E-mail">{selected.email}</DetailLine>
                <DetailLine label="Statut"><StatusBadge status={selected.status} /></DetailLine>
                <DetailLine label="Promotion">{state.promotions.find((item) => item.id === selected.promotionId)?.name ?? "Non concerné"}</DetailLine>
                <DetailLine label="Matricule">{selected.matricule ?? "Non concerné"}</DetailLine>
              </div>
              <SheetFooter className="grid grid-cols-2">
                <Button variant="outline" onClick={() => edit(selected.id)}><Pencil />Modifier</Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Supprimer</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      <UserFormDialog key={`${editing?.id ?? "new"}-${formOpen}`} open={formOpen} onOpenChange={setFormOpen} user={editing} />
      {selected && <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Supprimer ${selected.name} ?`} description="Cette action est définitive et sera refusée si des données dépendent de ce compte." onDelete={() => deleteUser(selected.id)} onDeleted={() => setSelectedId(undefined)} />}
    </div>
  );
}

function PromotionFormDialog({ open, onOpenChange, promotion }: { open: boolean; onOpenChange: (open: boolean) => void; promotion?: AdminPromotion }) {
  const { createPromotion, updatePromotion } = useAdminData();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: AdminPromotionInput = {
      name: String(data.get("name") ?? ""),
      department: String(data.get("department") ?? ""),
      academicYear: String(data.get("academicYear") ?? ""),
    };
    const result = promotion ? updatePromotion(promotion.id, input) : createPromotion(input);
    if (!result.ok) return setErrors(result.fieldErrors ?? { form: result.message });
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{promotion ? "Modifier la promotion" : "Ajouter une promotion"}</DialogTitle><DialogDescription>Les effectifs et cours seront calculés automatiquement.</DialogDescription></DialogHeader>
        <form key={`${promotion?.id ?? "new"}-${open}`} onSubmit={submit} className="space-y-4">
          {errors.form && <Alert variant="destructive"><AlertDescription>{errors.form}</AlertDescription></Alert>}
          <div className="space-y-2"><Label htmlFor="promotion-name">Nom</Label><Input id="promotion-name" name="name" defaultValue={promotion?.name} placeholder="L1 Informatique" /><FieldMessage message={errors.name} /></div>
          <div className="space-y-2"><Label htmlFor="promotion-department">Département</Label><Input id="promotion-department" name="department" defaultValue={promotion?.department} placeholder="Sciences informatiques" /><FieldMessage message={errors.department} /></div>
          <div className="space-y-2"><Label htmlFor="promotion-year">Année académique</Label><Input id="promotion-year" name="academicYear" defaultValue={promotion?.academicYear ?? "2025-2026"} /><FieldMessage message={errors.academicYear} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button type="submit">{promotion ? "Enregistrer" : "Ajouter"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PromotionsManager() {
  const { state, deletePromotion } = useAdminData();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selected = state.promotions.find((item) => item.id === selectedId);
  const editing = state.promotions.find((item) => item.id === editingId);
  const filtered = state.promotions.filter((promotion) => `${promotion.name} ${promotion.department}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const counts = (promotionId: string) => ({
    students: state.users.filter((user) => user.promotionId === promotionId).length,
    courses: state.courses.filter((course) => course.promotionId === promotionId).length,
  });

  function edit(id: string) { setEditingId(id); setFormOpen(true); }

  return (
    <div>
      <PageHeader title="Promotions" description="Structurez les groupes académiques et leurs rattachements." action={<Button onClick={() => { setEditingId(undefined); setFormOpen(true); }}><Plus />Ajouter une promotion</Button>} />
      <div className="border bg-background">
        <div className="border-b p-4"><SearchField value={query} onChange={setQuery} placeholder="Rechercher une promotion ou un département..." /></div>
        <div className="hidden md:block">
          <Table>
            <TableHeader><TableRow><TableHead>Promotion</TableHead><TableHead>Année</TableHead><TableHead>Étudiants</TableHead><TableHead>Cours</TableHead><TableHead className="w-14" /></TableRow></TableHeader>
            <TableBody>{filtered.map((promotion) => {
              const summary = counts(promotion.id);
              return <TableRow key={promotion.id}><TableCell><button className="text-left" onClick={() => setSelectedId(promotion.id)}><span className="block font-medium">{promotion.name}</span><span className="text-xs text-muted-foreground">{promotion.department}</span></button></TableCell><TableCell>{promotion.academicYear}</TableCell><TableCell>{summary.students}</TableCell><TableCell>{summary.courses}</TableCell><TableCell><RowActions onView={() => setSelectedId(promotion.id)} onEdit={() => edit(promotion.id)} onDelete={() => { setSelectedId(promotion.id); setDeleteOpen(true); }} /></TableCell></TableRow>;
            })}</TableBody>
          </Table>
        </div>
        <div className="divide-y md:hidden">{filtered.map((promotion) => {
          const summary = counts(promotion.id);
          return <button key={promotion.id} onClick={() => setSelectedId(promotion.id)} className="flex w-full items-center gap-3 p-4 text-left"><span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><GraduationCap className="size-4" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{promotion.name}</span><span className="block truncate text-xs text-muted-foreground">{promotion.department}</span></span><span className="text-right text-xs text-muted-foreground">{summary.students} étudiants<br />{summary.courses} cours</span></button>;
        })}</div>
      </div>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full sm:max-w-md">{selected && <><SheetHeader><SheetTitle>{selected.name}</SheetTitle><SheetDescription>{selected.department}</SheetDescription></SheetHeader><div className="px-4"><DetailLine label="Année">{selected.academicYear}</DetailLine><DetailLine label="Étudiants">{counts(selected.id).students}</DetailLine><DetailLine label="Cours">{counts(selected.id).courses}</DetailLine></div><SheetFooter className="grid grid-cols-2"><Button variant="outline" onClick={() => edit(selected.id)}><Pencil />Modifier</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Supprimer</Button></SheetFooter></>}</SheetContent>
      </Sheet>
      <PromotionFormDialog open={formOpen} onOpenChange={setFormOpen} promotion={editing} />
      {selected && <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Supprimer ${selected.name} ?`} description="La suppression est refusée tant que des étudiants, cours ou sessions y sont liés." onDelete={() => deletePromotion(selected.id)} onDeleted={() => setSelectedId(undefined)} />}
    </div>
  );
}

function CourseFormDialog({ open, onOpenChange, course }: { open: boolean; onOpenChange: (open: boolean) => void; course?: AdminCourse }) {
  const { state, createCourse, updateCourse } = useAdminData();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const teachers = state.users.filter((user) => user.role === "TEACHER" && user.status === "ACTIVE");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: AdminCourseInput = {
      code: String(data.get("code") ?? ""),
      name: String(data.get("name") ?? ""),
      teacherId: String(data.get("teacherId") ?? ""),
      promotionId: String(data.get("promotionId") ?? ""),
      weeklyHours: Number(data.get("weeklyHours") ?? 0),
    };
    const result = course ? updateCourse(course.id, input) : createCourse(input);
    if (!result.ok) return setErrors(result.fieldErrors ?? { form: result.message });
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{course ? "Modifier le cours" : "Ajouter un cours"}</DialogTitle><DialogDescription>Un cours est affecté à un enseignant actif et une promotion.</DialogDescription></DialogHeader>
        <form key={`${course?.id ?? "new"}-${open}`} onSubmit={submit} className="space-y-4">
          {errors.form && <Alert variant="destructive"><AlertDescription>{errors.form}</AlertDescription></Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="course-code">Code</Label><Input id="course-code" name="code" defaultValue={course?.code} placeholder="INF301" /><FieldMessage message={errors.code} /></div>
            <div className="space-y-2"><Label htmlFor="course-hours">Heures par semaine</Label><Input id="course-hours" name="weeklyHours" type="number" min="1" max="20" defaultValue={course?.weeklyHours ?? 4} /><FieldMessage message={errors.weeklyHours} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="course-name">Intitulé</Label><Input id="course-name" name="name" defaultValue={course?.name} placeholder="Développement web" /><FieldMessage message={errors.name} /></div>
            <div className="space-y-2"><Label>Enseignant</Label><Select name="teacherId" defaultValue={course?.teacherId}><SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}</SelectContent></Select><FieldMessage message={errors.teacherId} /></div>
            <div className="space-y-2"><Label>Promotion</Label><Select name="promotionId" defaultValue={course?.promotionId}><SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}</SelectContent></Select><FieldMessage message={errors.promotionId} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button type="submit">{course ? "Enregistrer" : "Ajouter"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CoursesManager() {
  const { state, deleteCourse } = useAdminData();
  const [query, setQuery] = useState("");
  const [promotionFilter, setPromotionFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selected = state.courses.find((item) => item.id === selectedId);
  const editing = state.courses.find((item) => item.id === editingId);
  const filtered = state.courses.filter((course) => (
    `${course.code} ${course.name}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")) &&
    (promotionFilter === "ALL" || course.promotionId === promotionFilter)
  ));
  const teacherName = (id: string) => state.users.find((user) => user.id === id)?.name ?? "Non affecté";
  const promotionName = (id: string) => state.promotions.find((promotion) => promotion.id === id)?.name ?? "Non affectée";
  function edit(id: string) { setEditingId(id); setFormOpen(true); }

  return (
    <div>
      <PageHeader title="Cours" description="Gérez les affectations entre cours, enseignants et promotions." action={<Button onClick={() => { setEditingId(undefined); setFormOpen(true); }}><Plus />Ajouter un cours</Button>} />
      <div className="border bg-background">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(260px,1fr)_220px]"><SearchField value={query} onChange={setQuery} placeholder="Code ou intitulé..." /><Select value={promotionFilter} onValueChange={setPromotionFilter}><SelectTrigger className="w-full"><SelectValue placeholder="Toutes les promotions" /></SelectTrigger><SelectContent><SelectItem value="ALL">Toutes les promotions</SelectItem>{state.promotions.map((promotion) => <SelectItem key={promotion.id} value={promotion.id}>{promotion.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Cours</TableHead><TableHead>Enseignant</TableHead><TableHead>Promotion</TableHead><TableHead>Volume</TableHead><TableHead className="w-14" /></TableRow></TableHeader><TableBody>{filtered.map((course) => <TableRow key={course.id}><TableCell><button className="text-left" onClick={() => setSelectedId(course.id)}><span className="block font-medium">{course.name}</span><span className="text-xs text-muted-foreground">{course.code}</span></button></TableCell><TableCell>{teacherName(course.teacherId)}</TableCell><TableCell>{promotionName(course.promotionId)}</TableCell><TableCell>{course.weeklyHours} h</TableCell><TableCell><RowActions onView={() => setSelectedId(course.id)} onEdit={() => edit(course.id)} onDelete={() => { setSelectedId(course.id); setDeleteOpen(true); }} /></TableCell></TableRow>)}</TableBody></Table></div>
        <div className="divide-y md:hidden">{filtered.map((course) => <button key={course.id} onClick={() => setSelectedId(course.id)} className="flex w-full items-center gap-3 p-4 text-left"><span className="flex size-9 items-center justify-center bg-primary/8 text-primary"><BookOpen className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{course.name}</span><span className="block truncate text-xs text-muted-foreground">{course.code} · {teacherName(course.teacherId)}</span></span><span className="text-xs text-muted-foreground">{course.weeklyHours} h</span></button>)}</div>
      </div>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(undefined)}><SheetContent className="w-full sm:max-w-md">{selected && <><SheetHeader><SheetTitle>{selected.name}</SheetTitle><SheetDescription>{selected.code}</SheetDescription></SheetHeader><div className="px-4"><DetailLine label="Enseignant">{teacherName(selected.teacherId)}</DetailLine><DetailLine label="Promotion">{promotionName(selected.promotionId)}</DetailLine><DetailLine label="Volume">{selected.weeklyHours} heures par semaine</DetailLine><DetailLine label="Sessions">{state.sessions.filter((session) => session.courseId === selected.id).length}</DetailLine></div><SheetFooter className="grid grid-cols-2"><Button variant="outline" onClick={() => edit(selected.id)}><Pencil />Modifier</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Supprimer</Button></SheetFooter></>}</SheetContent></Sheet>
      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} course={editing} />
      {selected && <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Supprimer ${selected.code} ?`} description="Un cours possédant des sessions ne peut pas être supprimé." onDelete={() => deleteCourse(selected.id)} onDeleted={() => setSelectedId(undefined)} />}
    </div>
  );
}
