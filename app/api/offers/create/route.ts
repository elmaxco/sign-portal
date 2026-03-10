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
      { error: "Too many requests. Please try again soon." },
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const company = body.company?.trim() || "";
  const orgNumber = body.orgNumber?.trim() || "";
  const phone = body.phone?.trim() || "";

  if (!name || !email || !company || !orgNumber || !phone) {
    return NextResponse.json(
      { error: "name, email, company, orgNumber and phone are required." },
      { status: 400 },
    );
  }

  const created = await createOfferServer({
    name,
    email,
    company,
    orgNumber,
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
    emailError = error instanceof Error ? error.message : "Failed to send confirmation email.";
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    confirmationEmailSent: !emailError,
    ...(emailError ? { confirmationEmailError: emailError } : {}),
  });
}
