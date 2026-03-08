import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementByTokenServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";

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

  const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);
  const signUrl = new URL(`/sign/${agreement.token}`, baseUrl).toString();

  try {
    await sendAgreementLinkEmail({
      to: agreement.recipientEmail,
      signUrl,
      agreementTitle: agreement.title,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const marked = await markAgreementEmailSentByTokenServer({ token: agreement.token });

  if (!marked.updated) {
    return NextResponse.json({ error: "Agreement not found while updating sentAt." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, wasReminder: marked.wasReminder });
}
