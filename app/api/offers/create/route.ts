import { NextRequest, NextResponse } from "next/server";
import { createOfferServer } from "@/lib/offers-server";
import { sendOfferReceivedConfirmationEmail } from "@/lib/mail";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwarded?.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = await consumeRateLimit({
    namespace: "offers_create_ip",
    key: ip,
    windowMs: 60_000,
    maxHits: 5,
  });

  if (!rate.allowed) {
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

  let body: {
    name?: string;
    email?: string;
    company?: string;
    orgNumber?: string;
    phone?: string;
    smsConsent?: boolean;
    packageName?: string;
    notes?: string;
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
    };
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON-body." }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const company = body.company?.trim() || "";
  const orgNumber = body.orgNumber?.trim().replace(/\s/g, "") || "";
  const phone = body.phone?.trim().replace(/\s/g, "") || "";

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

  const created = await createOfferServer({
    name,
    email,
    company,
    orgNumber: orgNumber.includes("-") ? orgNumber : `${orgNumber.slice(0, 6)}-${orgNumber.slice(6)}`,
    phone,
    smsConsent: body.smsConsent === true,
    packageName: body.packageName?.trim() || "",
    notes: body.notes?.trim() || "",
  });

  let emailError: string | null = null;

  try {
    await sendOfferReceivedConfirmationEmail({
      to: email,
      customerName: name,
      company,
      packageName: body.packageName?.trim() || "",
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
