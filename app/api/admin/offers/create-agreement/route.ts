import { NextRequest, NextResponse } from "next/server";
import { createAgreementFromOfferServer } from "@/lib/offers-server";
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
  let body: { offerId?: string };

  try {
    body = (await request.json()) as { offerId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const offerId = body.offerId?.trim() || "";

  if (!offerId) {
    return NextResponse.json({ error: "Missing offerId." }, { status: 400 });
  }

  try {
    const agreement = await createAgreementFromOfferServer(offerId);

    if (!agreement) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }

    let signLinkEmailSent = false;
    let signLinkEmailError: string | null = null;

    try {
      const createdAgreement = await getAgreementByTokenServer(agreement.token);

      if (!createdAgreement?.recipientEmail) {
        throw new Error("Agreement is missing recipient email.");
      }

      const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
      const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);
      const signUrl = new URL(`/sign/${agreement.token}`, baseUrl).toString();

      await sendAgreementLinkEmail({
        to: createdAgreement.recipientEmail,
        signUrl,
        agreementTitle: createdAgreement.title,
        variant: "initial",
      });

      await markAgreementEmailSentByTokenServer({ token: agreement.token });
      signLinkEmailSent = true;
    } catch (error) {
      signLinkEmailError = error instanceof Error ? error.message : "Failed to send sign link.";
    }

    return NextResponse.json({
      ok: true,
      agreement,
      signLinkEmailSent,
      ...(signLinkEmailError ? { signLinkEmailError } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agreement from offer.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
