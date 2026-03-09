import { NextRequest, NextResponse } from "next/server";
import { createAgreementFromOfferServer } from "@/lib/offers-server";
import {
  getAgreementByTokenServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";
import { isSmsConfigured, sendAgreementLinkSms } from "@/lib/sms";

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
    let signLinkSmsSent = false;
    let signLinkSmsError: string | null = null;
    let signLinkSmsSkippedReason: string | null = null;

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

      if (!createdAgreement.recipientSmsConsent) {
        signLinkSmsSkippedReason = "SMS consent is missing.";
      } else if (!createdAgreement.recipientPhone) {
        signLinkSmsSkippedReason = "Recipient phone is missing.";
      } else if (!isSmsConfigured()) {
        signLinkSmsSkippedReason = "SMS is not configured.";
      } else {
        try {
          await sendAgreementLinkSms({
            to: createdAgreement.recipientPhone,
            signUrl,
            agreementTitle: createdAgreement.title,
            variant: "initial",
          });
          signLinkSmsSent = true;
        } catch (error) {
          signLinkSmsError = error instanceof Error ? error.message : "Failed to send SMS sign link.";
        }
      }
    } catch (error) {
      signLinkEmailError = error instanceof Error ? error.message : "Failed to send sign link.";
    }

    return NextResponse.json({
      ok: true,
      agreement,
      signLinkEmailSent,
      signLinkSmsSent,
      ...(signLinkEmailError ? { signLinkEmailError } : {}),
      ...(signLinkSmsError ? { signLinkSmsError } : {}),
      ...(signLinkSmsSkippedReason ? { signLinkSmsSkippedReason } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agreement from offer.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
