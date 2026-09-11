export type AdminImportKind = "USERS" | "PROMOTIONS" | "COURSES";

export interface AdminImportPreviewRow {
  line: number;
  values: Record<string, string>;
  errors: string[];
}

export interface AdminImportPreview {
  kind: AdminImportKind;
  total: number;
  validCount: number;
  invalidCount: number;
  rows: AdminImportPreviewRow[];
}

export interface AdminImportResult {
  ok: boolean;
  message: string;
  createdCount?: number;
  emailAcceptedCount?: number;
  emailFailedCount?: number;
  preview?: AdminImportPreview;
}
