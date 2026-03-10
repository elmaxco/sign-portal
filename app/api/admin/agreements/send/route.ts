import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementByTokenServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";
import { isSmsConfigured, sendAgreementLinkSms } from "@/lib/sms";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getAbsoluteBaseUrl(rawBaseUrl: string | undefined, fallbackOrigin: string) {
  const candidate = (rawBaseUrl || fallbackOrigin).trim();
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return fallbackOrigin.replace(/\/$/, "");
  }
}

export async function POST(request: NextRequest) {
  let body: { token?: string };

  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim() || "";

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const agreement = await getAgreementByTokenServer(token);

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  if (!agreement.recipientEmail) {
    return NextResponse.json({ error: "Agreement is missing recipient email." }, { status: 400 });
  }

  const rate = await consumeRateLimit({
    namespace: "agreement_send_token",
    key: agreement.token,
    windowMs: 60_000,
    maxHits: 1,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many send attempts for this agreement. Please wait a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);
  const signUrl = new URL(`/sign/${agreement.token}`, baseUrl).toString();

  try {
    await sendAgreementLinkEmail({
      to: agreement.recipientEmail,
      signUrl,
      agreementTitle: agreement.title,
      variant: agreement.sentAt ? "reminder" : "initial",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const marked = await markAgreementEmailSentByTokenServer({ token: agreement.token });

  if (!marked.updated) {
    return NextResponse.json({ error: "Agreement not found while updating sentAt." }, { status: 404 });
  }

  let smsSent = false;
  let smsError: string | null = null;
  let smsSkippedReason: string | null = null;

  if (!agreement.recipientSmsConsent) {
    smsSkippedReason = "SMS consent is missing.";
  } else if (!agreement.recipientPhone) {
    smsSkippedReason = "Recipient phone is missing.";
  } else if (!isSmsConfigured()) {
    smsSkippedReason = "SMS is not configured.";
  } else {
    try {
      await sendAgreementLinkSms({
        to: agreement.recipientPhone,
        signUrl,
        agreementTitle: agreement.title,
        variant: marked.wasReminder ? "reminder" : "initial",
      });
      smsSent = true;
    } catch (error) {
      smsError = error instanceof Error ? error.message : "Failed to send SMS.";
    }
  }

  return NextResponse.json({
    ok: true,
    wasReminder: marked.wasReminder,
    smsSent,
    ...(smsError ? { smsError } : {}),
    ...(smsSkippedReason ? { smsSkippedReason } : {}),
  });
}
