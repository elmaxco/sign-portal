type SendAgreementEmailInput = {
  to: string;
  signUrl: string;
  agreementTitle: string;
};

export async function sendAgreementLinkEmail(input: SendAgreementEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or MAIL_FROM env variable.");
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

  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message || "Failed to send email with Resend.");
  }

  return payload.id;
}
