import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authEmailConfigurationReady, sendTransactionalAuthEmail } from "@/lib/auth-email-transport.server";

const message = {
  recipient: { email: "student@example.test", name: "Sarah Mbuyi" },
  subject: "Activez votre compte Presence Plus",
  html: "<p>Activation</p>",
  text: "Activation",
  idempotencyKey: "invitation:token-id",
};

describe("auth email transport", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_EMAIL_MODE", "live");
    vi.stubEnv("AUTH_EMAIL_PROVIDER", "brevo");
    vi.stubEnv("BREVO_API_KEY", "test-brevo-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "sender@example.test");
    vi.stubEnv("BREVO_SENDER_NAME", "Presence Plus");
    vi.stubEnv("AUTH_EMAIL_REPLY_TO", "reply@example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reconnaît une configuration Brevo complète", () => {
    expect(authEmailConfigurationReady()).toBe(true);
  });

  it("envoie un e-mail transactionnel via Brevo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "brevo-message-1" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTransactionalAuthEmail(message);

    expect(result).toMatchObject({ sent: true, simulated: false, status: "ACCEPTED", providerMessageId: "brevo-message-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers).toMatchObject({ "api-key": "test-brevo-key", "content-type": "application/json" });
    const payload = JSON.parse(String(init.body));
    expect(payload).toMatchObject({
      sender: { email: "sender@example.test", name: "Presence Plus" },
      to: [{ email: "student@example.test", name: "Sarah Mbuyi" }],
      replyTo: { email: "reply@example.test", name: "Presence Plus" },
    });
  });

  it("retourne un échec métier lorsque Brevo refuse le message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "unauthorized", message: "Key rejected" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })));
    await expect(sendTransactionalAuthEmail(message)).resolves.toMatchObject({
      sent: false,
      status: "FAILED",
      providerHttpStatus: 401,
      providerErrorCode: "unauthorized",
    });
  });

  it("conserve la remise manuelle sans contacter Brevo", async () => {
    vi.stubEnv("AUTH_EMAIL_MODE", "manual");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendTransactionalAuthEmail(message)).resolves.toMatchObject({ sent: false, simulated: true, status: "SIMULATED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("n’envoie rien sans activation explicite du mode live", async () => {
    vi.stubEnv("AUTH_EMAIL_MODE", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendTransactionalAuthEmail(message)).resolves.toMatchObject({ sent: true, simulated: true, status: "SIMULATED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
