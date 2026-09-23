"use server";

import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewerForRole } from "@/lib/authenticated-viewer";
import { unusablePassword } from "@/lib/auth-crypto.server";
import { issueAuthToken } from "@/lib/auth-token.server";
import { deliverAuthEmail } from "@/lib/auth-email.server";
import { SERIALIZABLE_TRANSACTION_OPTIONS } from "@/lib/transaction-options";
import type { AdminImportKind, AdminImportPreview, AdminImportPreviewRow, AdminImportResult } from "@/types/admin-import";

const MAX_IMPORT_BYTES = 600_000;
const MAX_IMPORT_ROWS = 500;
const text = z.string().trim().min(2);
const email = z.email().transform((value) => value.trim().toLowerCase());

const schemas = {
  USERS: z.object({
    nom: text,
    email,
    role: z.enum(["TEACHER", "STUDENT"]),
    matricule: z.string().trim().optional().default(""),
    promotion: z.string().trim().optional().default(""),
    statut: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  }).superRefine((value, context) => {
    if (value.role === "STUDENT" && value.matricule.length < 4) context.addIssue({ code: "custom", path: ["matricule"], message: "Matricule requis (4 caractères minimum)." });
    if (value.role === "STUDENT" && !value.promotion) context.addIssue({ code: "custom", path: ["promotion"], message: "Promotion requise pour un étudiant." });
  }),
  PROMOTIONS: z.object({
    nom: text,
    departement: text,
    annee_academique: z.string().regex(/^\d{4}-\d{4}$/, "Format attendu: 2025-2026."),
    description: z.string().trim().max(500).optional().default(""),
  }),
  COURSES: z.object({
    code: z.string().trim().min(3).max(12).transform((value) => value.toUpperCase()),
    intitule: text,
    enseignant_email: email,
    promotion: text,
    heures_hebdomadaires: z.coerce.number().int().min(1).max(20),
    description: z.string().trim().max(500).optional().default(""),
  }),
} as const;

function parseCsv(csvText: string) {
  if (!csvText.trim()) throw new Error("Le fichier CSV est vide.");
  if (Buffer.byteLength(csvText, "utf8") > MAX_IMPORT_BYTES) throw new Error("Le fichier dépasse la taille autorisée de 600 Ko.");
  const rows = parse(csvText, {
    bom: true,
    columns: (headers: string[]) => headers.map((header) => header.trim().toLocaleLowerCase("fr")),
    delimiter: [",", ";"],
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Un import est limité à ${MAX_IMPORT_ROWS} lignes.`);
  return rows;
}

function issuesOf(error: z.ZodError) {
  return error.issues.map((issue) => `${String(issue.path[0] ?? "ligne")}: ${issue.message}`);
}

async function buildPreview(kind: AdminImportKind, csvText: string): Promise<AdminImportPreview> {
  const rows = parseCsv(csvText);
  const [users, promotions, courses] = await Promise.all([
    prisma.user.findMany({ select: { email: true, matricule: true, role: true, status: true } }),
    prisma.promotion.findMany({ select: { name: true, archivedAt: true } }),
    prisma.course.findMany({ select: { code: true, name: true } }),
  ]);
  const knownEmails = new Set(users.map((item) => item.email.toLocaleLowerCase("fr")));
  const knownMatricules = new Set(users.flatMap((item) => item.matricule ? [item.matricule.toLocaleUpperCase("fr")] : []));
  const activeTeacherEmails = new Set(users.filter((item) => item.role === "TEACHER" && item.status === "ACTIVE").map((item) => item.email.toLocaleLowerCase("fr")));
  const knownPromotions = new Map(promotions.map((item) => [item.name.toLocaleLowerCase("fr"), item]));
  const knownCodes = new Set(courses.map((item) => item.code.toLocaleUpperCase("fr")));
  const knownCourseNames = new Set(courses.map((item) => item.name.toLocaleLowerCase("fr")));
  const seenEmails = new Set<string>();
  const seenMatricules = new Set<string>();
  const seenPromotions = new Set<string>();
  const seenCodes = new Set<string>();
  const seenCourseNames = new Set<string>();

  const previewRows: AdminImportPreviewRow[] = rows.map((values, index) => {
    const errors: string[] = [];
    if (kind === "USERS") {
      const parsed = schemas.USERS.safeParse(values);
      if (!parsed.success) errors.push(...issuesOf(parsed.error));
      else {
      const value = parsed.data;
      const normalizedEmail = value.email.toLocaleLowerCase("fr");
      const matricule = value.matricule.toLocaleUpperCase("fr");
      if (knownEmails.has(normalizedEmail) || seenEmails.has(normalizedEmail)) errors.push("email: adresse déjà utilisée.");
      if (matricule && (knownMatricules.has(matricule) || seenMatricules.has(matricule))) errors.push("matricule: valeur déjà utilisée.");
      if (value.role === "STUDENT") {
        const promotion = knownPromotions.get(value.promotion.toLocaleLowerCase("fr"));
        if (!promotion) errors.push("promotion: promotion introuvable.");
        else if (promotion.archivedAt) errors.push("promotion: cette promotion est archivée.");
      }
      seenEmails.add(normalizedEmail);
      if (matricule) seenMatricules.add(matricule);
      }
    }
    if (kind === "PROMOTIONS") {
      const parsed = schemas.PROMOTIONS.safeParse(values);
      if (!parsed.success) errors.push(...issuesOf(parsed.error));
      else {
      const name = parsed.data.nom.toLocaleLowerCase("fr");
      if (knownPromotions.has(name) || seenPromotions.has(name)) errors.push("nom: promotion déjà existante.");
      seenPromotions.add(name);
      }
    }
    if (kind === "COURSES") {
      const parsed = schemas.COURSES.safeParse(values);
      if (!parsed.success) errors.push(...issuesOf(parsed.error));
      else {
      const value = parsed.data;
      const code = value.code.toLocaleUpperCase("fr");
      const name = value.intitule.toLocaleLowerCase("fr");
      if (knownCodes.has(code) || seenCodes.has(code)) errors.push("code: code déjà utilisé.");
      if (knownCourseNames.has(name) || seenCourseNames.has(name)) errors.push("intitule: intitulé déjà utilisé.");
      const promotion = knownPromotions.get(value.promotion.toLocaleLowerCase("fr"));
      if (!promotion) errors.push("promotion: promotion introuvable.");
      else if (promotion.archivedAt) errors.push("promotion: cette promotion est archivée.");
      if (!activeTeacherEmails.has(value.enseignant_email.toLocaleLowerCase("fr"))) errors.push("enseignant_email: enseignant actif introuvable.");
      seenCodes.add(code);
      seenCourseNames.add(name);
      }
    }
    return { line: index + 2, values, errors };
  });
  const invalidCount = previewRows.filter((row) => row.errors.length > 0).length;
  return { kind, total: previewRows.length, validCount: previewRows.length - invalidCount, invalidCount, rows: previewRows };
}

export async function previewAdminImportAction(kind: AdminImportKind, csvText: string): Promise<AdminImportResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  try {
    const preview = await buildPreview(kind, csvText);
    return { ok: preview.invalidCount === 0 && preview.total > 0, message: preview.invalidCount ? "Corrigez les lignes signalées avant l’import." : `${preview.total} ligne(s) prête(s) à importer.`, preview };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Le fichier CSV ne peut pas être lu." };
  }
}

export async function applyAdminImportAction(kind: AdminImportKind, csvText: string): Promise<AdminImportResult> {
  const viewer = await getViewerForRole("ADMIN");
  if (!viewer) return { ok: false, message: "Accès administrateur requis." };
  const preview = await buildPreview(kind, csvText).catch(() => null);
  if (!preview || !preview.total || preview.invalidCount) return { ok: false, message: "L’import a changé ou contient des erreurs. Relancez l’aperçu.", preview: preview ?? undefined };
  const rows = parseCsv(csvText);
  const bulkPasswordHash = kind === "USERS" ? await bcrypt.hash(unusablePassword(), 12) : "";
  const issued: { tokenId: string; email: string; name: string; token: string; manualCode: string }[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      if (kind === "PROMOTIONS") {
        for (const raw of rows) {
          const value = schemas.PROMOTIONS.parse(raw);
          const promotion = await tx.promotion.create({ data: { name: value.nom, department: value.departement, academicYear: value.annee_academique, description: value.description || null } });
          await tx.auditLog.create({ data: { actorId: viewer.id, action: "IMPORT_PROMOTION", entityType: "Promotion", entityId: promotion.id } });
        }
      }
      if (kind === "COURSES") {
        for (const raw of rows) {
          const value = schemas.COURSES.parse(raw);
          const [teacher, promotion] = await Promise.all([
            tx.user.findFirst({ where: { email: { equals: value.enseignant_email, mode: "insensitive" }, role: "TEACHER", status: "ACTIVE" }, select: { id: true } }),
            tx.promotion.findFirst({ where: { name: { equals: value.promotion, mode: "insensitive" }, archivedAt: null }, select: { id: true } }),
          ]);
          if (!teacher || !promotion) throw new Error("Une affectation de cours n’est plus disponible.");
          const course = await tx.course.create({ data: { code: value.code, name: value.intitule, teacherId: teacher.id, promotionId: promotion.id, weeklyHours: value.heures_hebdomadaires, description: value.description || null, active: true } });
          await tx.auditLog.create({ data: { actorId: viewer.id, action: "IMPORT_COURSE", entityType: "Course", entityId: course.id } });
        }
      }
      if (kind === "USERS") {
        const promotionRows = await tx.promotion.findMany({ where: { archivedAt: null }, select: { id: true, name: true } });
        const promotionByName = new Map(promotionRows.map((item) => [item.name.toLocaleLowerCase("fr"), item.id]));
        for (const raw of rows) {
          const value = schemas.USERS.parse(raw);
          const promotionId = value.role === "STUDENT" ? promotionByName.get(value.promotion.toLocaleLowerCase("fr")) : null;
          if (value.role === "STUDENT" && !promotionId) throw new Error("Une promotion étudiante n’est plus disponible.");
          const user = await tx.user.create({ data: { name: value.nom, email: value.email, role: value.role, status: value.statut, dataRetentionStartedAt: value.statut === "INACTIVE" ? new Date() : null, passwordHash: bulkPasswordHash, activatedAt: null, mustChangePassword: true, matricule: value.role === "STUDENT" ? value.matricule.toLocaleUpperCase("fr") : null, promotionId } });
          if (value.statut === "ACTIVE") {
            const token = await issueAuthToken(user.id, "INVITATION", tx);
            issued.push({ tokenId: token.id, email: user.email, name: user.name, token: token.token, manualCode: token.manualCode });
          }
          await tx.auditLog.create({ data: { actorId: viewer.id, action: "IMPORT_USER", entityType: "User", entityId: user.id, metadata: { role: user.role } } });
        }
      }
    }, SERIALIZABLE_TRANSACTION_OPTIONS);
  } catch {
    return { ok: false, message: "Aucune ligne n’a été importée. Les données ont changé depuis l’aperçu; actualisez puis recommencez." };
  }

  const deliveries = await Promise.all(issued.map((item) => deliverAuthEmail(item.tokenId, { email: item.email, name: item.name }, "INVITATION", item.token, item.manualCode, viewer.id)));
  const failed = deliveries.filter((item) => item.status === "FAILED").length;
  return {
    ok: true,
    message: `${rows.length} ligne(s) importée(s).${issued.length ? ` ${issued.length - failed} invitation(s) acceptée(s) par le service d’e-mail${failed ? `, ${failed} à renvoyer` : ""}.` : ""}`,
    createdCount: rows.length,
    emailAcceptedCount: issued.length - failed,
    emailFailedCount: failed,
  };
}
