import "server-only";

import { Resend } from "resend";
import type { AuthDeliveryStatus } from "@/generated/prisma/client";

export type AuthEmailProvider = "brevo" | "resend";

export interface AuthEmailRecipient {
  email: string | null;
  name: string;
}

export interface AuthEmailResult {
  sent: boolean;
  simulated: boolean;
  message: string;
  status: AuthDeliveryStatus;
  providerMessageId?: string;
}

interface TransactionalAuthEmail {
  recipient: AuthEmailRecipient;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

function configuredProvider(): AuthEmailProvider | undefined {
  const provider = process.env.AUTH_EMAIL_PROVIDER?.trim().toLocaleLowerCase();
  if (provider === "brevo" || provider === "resend") return provider;
  return undefined;
}

export function authEmailConfigurationReady() {
  const provider = configuredProvider();
  if (provider === "brevo") {
    return Boolean(
      process.env.BREVO_API_KEY?.trim()
      && process.env.BREVO_SENDER_EMAIL?.trim()
      && process.env.BREVO_SENDER_NAME?.trim(),
    );
  }
  if (provider === "resend") {
    return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim());
  }
  return false;
}

function failedEmail(): AuthEmailResult {
  return { sent: false, simulated: false, status: "FAILED", message: "L’e-mail n’a pas pu être envoyé." };
}

async function sendWithBrevo(message: TransactionalAuthEmail): Promise<AuthEmailResult> {
  const replyTo = process.env.AUTH_EMAIL_REPLY_TO?.trim();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL!,
        name: process.env.BREVO_SENDER_NAME!,
      },
      to: [{ email: message.recipient.email, name: message.recipient.name }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      ...(replyTo ? { replyTo: { email: replyTo, name: process.env.BREVO_SENDER_NAME! } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return failedEmail();
  const data = await response.json().catch(() => undefined) as { messageId?: unknown } | undefined;
  const providerMessageId = typeof data?.messageId === "string" ? data.messageId : undefined;
  return {
    sent: true,
    simulated: false,
    status: "ACCEPTED",
    providerMessageId,
    message: "E-mail accepté par le service d’envoi.",
  };
}

async function sendWithResend(message: TransactionalAuthEmail): Promise<AuthEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const replyTo = process.env.AUTH_EMAIL_REPLY_TO?.trim();
  const response = await resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM!,
    to: message.recipient.email!,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(replyTo ? { replyTo } : {}),
  }, { idempotencyKey: message.idempotencyKey });

  if (response.error) return failedEmail();
  return {
    sent: true,
    simulated: false,
    status: "ACCEPTED",
    providerMessageId: response.data?.id,
    message: "E-mail accepté par le service d’envoi.",
  };
}

export async function sendTransactionalAuthEmail(message: TransactionalAuthEmail): Promise<AuthEmailResult> {
  if (!message.recipient.email) {
    return { sent: false, simulated: false, status: "NOT_APPLICABLE", message: "Aucun e-mail n’est associé à ce compte." };
  }

  const mode = process.env.AUTH_EMAIL_MODE;
  if (mode === "manual") {
    return { sent: false, simulated: true, status: "SIMULATED", message: "Le lien ou le code doit être remis directement à l’utilisateur." };
  }

  if (mode === "mock" || (process.env.NODE_ENV !== "production" && mode !== "live")) {
    if (process.env.NODE_ENV !== "test") console.info("[auth-email:mock] Envoi transactionnel simulé.");
    return { sent: true, simulated: true, status: "SIMULATED", message: "E-mail simulé en environnement local." };
  }

  if (mode !== "live" || !authEmailConfigurationReady()) {
    return { sent: false, simulated: false, status: "FAILED", message: "Le transport d’e-mail de production n’est pas configuré." };
  }

  return configuredProvider() === "brevo" ? sendWithBrevo(message) : sendWithResend(message);
}
