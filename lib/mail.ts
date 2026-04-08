type SendAgreementEmailInput = {
  to: string;
  signUrl: string;
  agreementTitle: string;
  variant?: "initial" | "reminder";
};

type SignedConfirmationInput = {
  to: string;
  agreementTitle: string;
  signUrl: string;
};

type AdminSignedNoticeInput = {
  to: string;
  agreementTitle: string;
  recipientEmail: string;
  signUrl: string;
};

type OfferReceivedConfirmationInput = {
  to: string;
  customerName: string;
  company: string;
  packageName?: string;
  offerId: string;
};

type AdminOfferNoticeInput = {
  to: string;
  offerId: string;
  customerName: string;
  customerEmail: string;
  company: string;
  orgNumber: string;
  phone: string;
  packageName?: string;
  notes?: string;
  bankIdFullName?: string;
  bankIdPersonalNumber?: string;
  bankIdProvider?: string;
  bankIdVerifiedAtIso?: string;
};

const DEFAULT_MAIL_FROM = "info@signportal.starring.se";
const DEFAULT_VERIFIED_DOMAIN = "signportal.starring.se";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getMailConfig() {
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

  return { apiKey, from };
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const { apiKey, from } = getMailConfig();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
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

export async function sendAgreementLinkEmail(input: SendAgreementEmailInput) {
  const isReminder = input.variant === "reminder";
  const subject = isReminder
    ? `Påminnelse: signera avtal ${input.agreementTitle || "Avtal"}`
    : `Signera avtal: ${input.agreementTitle || "Avtal"}`;
  const safeSignUrl = escapeHtml(input.signUrl);
  const introText = isReminder
    ? "Påminnelse: du verkar ha missat att signera ditt avtal."
    : "Du har ett avtal att signera.";

  const text = [
    "Hej!",
    "",
    introText,
    `Signeringslänk: ${input.signUrl}`,
    "",
    "Om länken inte fungerar, kopiera in den i webbläsaren.",
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    "<p>Hej!</p>",
    isReminder
      ? "<p><strong>Påminnelse:</strong> du verkar ha missat att signera ditt avtal.</p>"
      : "<p>Du har ett avtal att signera.</p>",
    `<p><a href="${safeSignUrl}" style="color:#0a58ca;text-decoration:underline">Klicka här för att signera avtalet</a></p>`,
    `<p>Om länken inte fungerar, kopiera denna adress: <a href="${safeSignUrl}">${safeSignUrl}</a></p>`,
    "</div>",
  ].join("");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendAgreementSignedConfirmationEmail(input: SignedConfirmationInput) {
  const subject = `Kvittens: ${input.agreementTitle || "Avtal"} är signerat`;
  const safeSignUrl = escapeHtml(input.signUrl);
  const text = [
    "Hej!",
    "",
    "Kvittensen är korrekt inskickad.",
    "Ditt avtal är nu signerat.",
    "",
    `Visa avtal: ${input.signUrl}`,
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    "<p>Hej!</p>",
    "<p>Kvittensen är korrekt inskickad.</p>",
    "<p>Ditt avtal är nu signerat.</p>",
    `<p><a href="${safeSignUrl}" style="color:#0a58ca;text-decoration:underline">Visa avtal</a></p>`,
    "</div>",
  ].join("");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendAdminAgreementSignedNoticeEmail(input: AdminSignedNoticeInput) {
  const subject = `[Admin] Avtal signerat: ${input.agreementTitle || "Avtal"}`;
  const safeSignUrl = escapeHtml(input.signUrl);
  const safeRecipient = escapeHtml(input.recipientEmail);
  const text = [
    "Ett avtal har signerats.",
    `Titel: ${input.agreementTitle || "(utan titel)"}`,
    `Mottagare: ${input.recipientEmail}`,
    `Avtalslänk: ${input.signUrl}`,
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    "<p>Ett avtal har signerats.</p>",
    `<p><strong>Titel:</strong> ${escapeHtml(input.agreementTitle || "(utan titel)")}</p>`,
    `<p><strong>Mottagare:</strong> ${safeRecipient}</p>`,
    `<p><a href="${safeSignUrl}" style="color:#0a58ca;text-decoration:underline">Öppna avtal</a></p>`,
    "</div>",
  ].join("");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendOfferReceivedConfirmationEmail(input: OfferReceivedConfirmationInput) {
  const subject = "Vi har mottagit din offertförfrågan";
  const safeName = escapeHtml(input.customerName || "kund");
  const safeCompany = escapeHtml(input.company || "-");
  const safePackage = escapeHtml(input.packageName || "-");
  const safeOfferId = escapeHtml(input.offerId);

  const text = [
    `Hej ${input.customerName || "kund"}!`,
    "",
    "Tack, vi har mottagit din offertförfrågan.",
    "Vi återkommer normalt inom 24 timmar med nästa steg.",
    "",
    `Företag: ${input.company || "-"}`,
    `Paket: ${input.packageName || "-"}`,
    `Referens-ID: ${input.offerId}`,
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    `<p>Hej ${safeName}!</p>`,
    "<p>Tack, vi har mottagit din offertförfrågan.</p>",
    "<p>Vi återkommer normalt inom 24 timmar med nästa steg.</p>",
    "<p><strong>Sammanfattning</strong></p>",
    `<p><strong>Företag:</strong> ${safeCompany}<br/><strong>Paket:</strong> ${safePackage}</p>`,
    `<p><strong>Referens-ID:</strong> ${safeOfferId}</p>`,
    "</div>",
  ].join("");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendAdminOfferRequestNoticeEmail(input: AdminOfferNoticeInput) {
  const subject = `[Admin] Ny verifierad offertförfrågan (${input.company || input.customerName})`;
  const safeOfferId = escapeHtml(input.offerId);
  const safeCustomerName = escapeHtml(input.customerName || "-");
  const safeEmail = escapeHtml(input.customerEmail || "-");
  const safeCompany = escapeHtml(input.company || "-");
  const safeOrgNumber = escapeHtml(input.orgNumber || "-");
  const safePhone = escapeHtml(input.phone || "-");
  const safePackage = escapeHtml(input.packageName || "-");
  const safeNotes = escapeHtml(input.notes || "-");
  const safeBankIdName = escapeHtml(input.bankIdFullName || "-");
  const safeBankIdPersonalNumber = escapeHtml(input.bankIdPersonalNumber || "-");
  const safeBankIdProvider = escapeHtml(input.bankIdProvider || "id.tic.io");
  const safeBankIdVerifiedAt = escapeHtml(input.bankIdVerifiedAtIso || "-");

  const text = [
    "Ny verifierad offertförfrågan.",
    `Referens-ID: ${input.offerId}`,
    "",
    `Namn: ${input.customerName || "-"}`,
    `E-post: ${input.customerEmail || "-"}`,
    `Företag: ${input.company || "-"}`,
    `Org.nr: ${input.orgNumber || "-"}`,
    `Telefon: ${input.phone || "-"}`,
    `Paket: ${input.packageName || "-"}`,
    `Kommentar: ${input.notes || "-"}`,
    "",
    `BankID namn: ${input.bankIdFullName || "-"}`,
    `BankID personnummer: ${input.bankIdPersonalNumber || "-"}`,
    `BankID provider: ${input.bankIdProvider || "id.tic.io"}`,
    `BankID verifierad: ${input.bankIdVerifiedAtIso || "-"}`,
  ].join("\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    "<p>Ny verifierad offertförfrågan.</p>",
    `<p><strong>Referens-ID:</strong> ${safeOfferId}</p>`,
    "<p><strong>Kunduppgifter</strong></p>",
    `<p><strong>Namn:</strong> ${safeCustomerName}<br/>`,
    `<strong>E-post:</strong> ${safeEmail}<br/>`,
    `<strong>Företag:</strong> ${safeCompany}<br/>`,
    `<strong>Org.nr:</strong> ${safeOrgNumber}<br/>`,
    `<strong>Telefon:</strong> ${safePhone}<br/>`,
    `<strong>Paket:</strong> ${safePackage}<br/>`,
    `<strong>Kommentar:</strong> ${safeNotes}</p>`,
    "<p><strong>BankID verifiering</strong></p>",
    `<p><strong>Namn:</strong> ${safeBankIdName}<br/>`,
    `<strong>Personnummer:</strong> ${safeBankIdPersonalNumber}<br/>`,
    `<strong>Provider:</strong> ${safeBankIdProvider}<br/>`,
    `<strong>Tid:</strong> ${safeBankIdVerifiedAt}</p>`,
    "</div>",
  ].join("");

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}
