import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementByTokenServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

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

  const baseUrl =
    process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL || request.nextUrl.origin;

  const signUrl = `${baseUrl.replace(/\/$/, "")}/sign/${agreement.token}`;

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

  await markAgreementEmailSentByTokenServer({ token: agreement.token });

  return NextResponse.json({ ok: true });
}
