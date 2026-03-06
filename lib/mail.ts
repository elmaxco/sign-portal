type SendAgreementEmailInput = {
  to: string;
  signUrl: string;
  agreementTitle: string;
};

const DEFAULT_MAIL_FROM = "noreply@signportal.starring.se";
const DEFAULT_VERIFIED_DOMAIN = "signportal.starring.se";

export async function sendAgreementLinkEmail(input: SendAgreementEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = (process.env.MAIL_FROM || DEFAULT_MAIL_FROM).trim();
  const verifiedDomain = (process.env.MAIL_VERIFIED_DOMAIN || DEFAULT_VERIFIED_DOMAIN)
    .trim()
    .toLowerCase();

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or MAIL_FROM env variable.");
  }

  if (!from.toLowerCase().endsWith(`@${verifiedDomain}`)) {
    throw new Error(`MAIL_FROM must use verified domain @${verifiedDomain}.`);
  }

  const subject = `Signera avtal: ${input.agreementTitle || "Avtal"}`;
  const text = [
    "Hej!",
    "",
    "Du har ett avtal att signera.",
    `Signeringslänk: ${input.signUrl}`,
    "",
    "Om länken inte fungerar, kopiera in den i webbläsaren.",
  ].join("\n");

  const html = `
    <p>Hej!</p>
    <p>Du har ett avtal att signera.</p>
    <p><a href="${input.signUrl}">Klicka här för att signera avtalet</a></p>
    <p>Om länken inte fungerar: ${input.signUrl}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
      html,
    }),
  });

  const rawBody = await response.text();
  const payload = (() => {
    try {
      return JSON.parse(rawBody) as {
        id?: string;
        error?: { message?: string };
        message?: string;
      };
    } catch {
      return null;
    }
  })();

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message || payload?.message || rawBody || "Unknown Resend error.";
    throw new Error(`Resend ${response.status}: ${apiMessage}`);
  }

  if (!payload?.id) {
    throw new Error("Resend succeeded but response did not include an email id.");
  }

  return payload.id;
}
