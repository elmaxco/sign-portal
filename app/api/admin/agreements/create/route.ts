import { NextRequest, NextResponse } from "next/server";
import {
  createAgreementServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";
import type { AgreementLinkItem } from "@/lib/agreements-server";
import { isSafeAbsoluteHttpUrl } from "@/lib/safe-href";

export const dynamic = "force-dynamic";

function normalizeAgreementLinks(input: unknown): AgreementLinkItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const maybeObj = item as { title?: unknown; url?: unknown };
      const title = typeof maybeObj.title === "string" ? maybeObj.title.trim() : "";
      const rawUrl = typeof maybeObj.url === "string" ? maybeObj.url.trim() : "";

      if (!title || !rawUrl) {
        return null;
      }

      try {
        const normalizedUrl = new URL(rawUrl).toString();

        if (!isSafeAbsoluteHttpUrl(normalizedUrl)) {
          return null;
        }

        return { title, url: normalizedUrl };
      } catch {
        return null;
      }
    })
    .filter((item): item is AgreementLinkItem => item !== null)
    .slice(0, 20);
}

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
  let body: {
    title?: string;
    content?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientSmsConsent?: boolean;
    links?: Array<{ title?: string; url?: string }>;
  };

  try {
    body = (await request.json()) as {
      title?: string;
      content?: string;
      recipientEmail?: string;
      recipientPhone?: string;
      recipientSmsConsent?: boolean;
      links?: Array<{ title?: string; url?: string }>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim() || "";
  const content = body.content?.trim() || "";
  const recipientEmail = body.recipientEmail?.trim().toLowerCase() || "";
  const recipientPhone = body.recipientPhone?.trim() || "";
  const recipientSmsConsent = body.recipientSmsConsent === true;
  const links = normalizeAgreementLinks(body.links);

  if (!title || !content || !recipientEmail) {
    return NextResponse.json(
      { error: "Title, content and recipientEmail are required." },
      { status: 400 },
    );
  }

  const created = await createAgreementServer({
    title,
    content,
    recipientEmail,
    recipientPhone,
    recipientSmsConsent,
    links,
  });

  const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);
  const signUrl = new URL(`/signup/${created.token}`, baseUrl).toString();

  try {
    await sendAgreementLinkEmail({
      to: recipientEmail,
      signUrl,
      agreementTitle: title,
    });

    await markAgreementEmailSentByTokenServer({ token: created.token });

    return NextResponse.json({
      ...created,
      mailSent: true,
    });
  } catch (error) {
    const mailError = error instanceof Error ? error.message : "Failed to send email.";

    return NextResponse.json({
      ...created,
      mailSent: false,
      mailError,
    });
  }
}
