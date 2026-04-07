import { NextRequest, NextResponse } from "next/server";
import { createOfferServer } from "@/lib/offers-server";
import { sendOfferReceivedConfirmationEmail } from "@/lib/mail";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const MIN_FORM_AGE_MS = 3_000;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 24;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwarded?.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

async function enforceRateLimit(input: {
  namespace: string;
  key: string;
  windowMs: number;
  maxHits: number;
}) {
  const rate = await consumeRateLimit(input);

  if (rate.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "För många förfrågningar. Försök igen om en stund." },
    {
      status: 429,
      headers: {
        "Retry-After": String(rate.retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRateLimitResponse = await enforceRateLimit({
    namespace: "offers_create_ip",
    key: ip,
    windowMs: 60_000,
    maxHits: 5,
  });

  if (ipRateLimitResponse) {
    return ipRateLimitResponse;
  }

  let body: {
    name?: string;
    email?: string;
    company?: string;
    orgNumber?: string;
    phone?: string;
    smsConsent?: boolean;
    packageName?: string;
    notes?: string;
    website?: string;
    startedAtMs?: number;
  };

  try {
    body = (await request.json()) as {
      name?: string;
      email?: string;
      company?: string;
      orgNumber?: string;
      phone?: string;
      smsConsent?: boolean;
      packageName?: string;
      notes?: string;
      website?: string;
      startedAtMs?: number;
    };
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON-body." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (typeof body.startedAtMs === "number") {
    const formAgeMs = Date.now() - body.startedAtMs;

    if (formAgeMs < MIN_FORM_AGE_MS || formAgeMs > MAX_FORM_AGE_MS) {
      return NextResponse.json({ error: "Formuläret kunde inte verifieras. Försök igen." }, { status: 400 });
    }
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const company = body.company?.trim() || "";
  const orgNumber = body.orgNumber?.trim().replace(/\s/g, "") || "";
  const phone = body.phone?.trim().replace(/\s/g, "") || "";
  const packageName = body.packageName?.trim() || "";
  const notes = body.notes?.trim() || "";

  if (!name || !email || !company || !orgNumber || !phone) {
    return NextResponse.json(
      { error: "Namn, e-post, företag, org.nr och telefon krävs." },
      { status: 400 },
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Ogiltig e-postadress." }, { status: 400 });
  }

  const orgNumberRegex = /^\d{6}-?\d{4}$/;
  if (!orgNumberRegex.test(orgNumber)) {
    return NextResponse.json({ error: "Ogiltigt org.nr. Använd formatet XXXXXX-XXXX." }, { status: 400 });
  }

  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return NextResponse.json({ error: "Ogiltigt telefonnummer." }, { status: 400 });
  }

  if (packageName.length > 120) {
    return NextResponse.json({ error: "Paket/produkt får vara max 120 tecken." }, { status: 400 });
  }

  if (notes.length > 2000) {
    return NextResponse.json({ error: "Kommentar får vara max 2000 tecken." }, { status: 400 });
  }

  const emailRateLimitResponse = await enforceRateLimit({
    namespace: "offers_create_email",
    key: email,
    windowMs: 10 * 60_000,
    maxHits: 3,
  });

  if (emailRateLimitResponse) {
    return emailRateLimitResponse;
  }

  const orgNumberRateLimitResponse = await enforceRateLimit({
    namespace: "offers_create_org",
    key: orgNumber,
    windowMs: 10 * 60_000,
    maxHits: 3,
  });

  if (orgNumberRateLimitResponse) {
    return orgNumberRateLimitResponse;
  }

  const phoneRateLimitResponse = await enforceRateLimit({
    namespace: "offers_create_phone",
    key: phone,
    windowMs: 10 * 60_000,
    maxHits: 3,
  });

  if (phoneRateLimitResponse) {
    return phoneRateLimitResponse;
  }

  const created = await createOfferServer({
    name,
    email,
    company,
    orgNumber: orgNumber.includes("-") ? orgNumber : `${orgNumber.slice(0, 6)}-${orgNumber.slice(6)}`,
    phone,
    smsConsent: body.smsConsent === true,
    packageName,
    notes,
  });

  let emailError: string | null = null;

  try {
    await sendOfferReceivedConfirmationEmail({
      to: email,
      customerName: name,
      company,
      packageName,
      offerId: created.id,
    });
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Kunde inte skicka bekräftelsemejl.";
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    confirmationEmailSent: !emailError,
    ...(emailError ? { confirmationEmailError: emailError } : {}),
  });
}
