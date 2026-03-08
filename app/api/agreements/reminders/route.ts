import { NextRequest, NextResponse } from "next/server";
import {
  listAutomaticReminderCandidatesServer,
  markAgreementEmailSentByTokenServer,
} from "@/lib/agreements-server";
import { sendAgreementLinkEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

const DEFAULT_FIRST_REMINDER_AFTER_MINUTES = 4 * 24 * 60;
const DEFAULT_REMINDER_INTERVAL_MINUTES = 4 * 24 * 60;

function getAbsoluteBaseUrl(rawBaseUrl: string | undefined, fallbackOrigin: string) {
  const candidate = (rawBaseUrl || fallbackOrigin).trim();
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return fallbackOrigin.replace(/\/$/, "");
  }
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AGREEMENTS_REMINDER_SECRET || process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Missing AGREEMENTS_REMINDER_SECRET or CRON_SECRET." },
      { status: 503 },
    );
  }

  const providedSecret = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  const isAuthorized = providedSecret === expectedSecret || bearerSecret === expectedSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const firstReminderAfterMinutes = parsePositiveInt(
    request.nextUrl.searchParams.get("firstReminderAfterMinutes"),
    DEFAULT_FIRST_REMINDER_AFTER_MINUTES,
  );
  const reminderIntervalMinutes = parsePositiveInt(
    request.nextUrl.searchParams.get("reminderIntervalMinutes"),
    DEFAULT_REMINDER_INTERVAL_MINUTES,
  );
  const maxItems = parsePositiveInt(request.nextUrl.searchParams.get("maxItems"), 100);

  const candidates = await listAutomaticReminderCandidatesServer({
    firstReminderAfterMinutes,
    reminderIntervalMinutes,
    maxItems,
  });

  const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);

  let sent = 0;
  const failed: Array<{ token: string; error: string }> = [];

  for (const candidate of candidates) {
    const signUrl = new URL(`/sign/${candidate.token}`, baseUrl).toString();

    try {
      await sendAgreementLinkEmail({
        to: candidate.recipientEmail,
        signUrl,
        agreementTitle: candidate.title,
      });

      const marked = await markAgreementEmailSentByTokenServer({ token: candidate.token });

      if (marked.updated) {
        sent += 1;
      } else {
        failed.push({ token: candidate.token, error: "Failed to update reminder timestamp." });
      }
    } catch (error) {
      failed.push({
        token: candidate.token,
        error: error instanceof Error ? error.message : "Unknown reminder error.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    sent,
    failed,
    config: {
      firstReminderAfterMinutes,
      reminderIntervalMinutes,
      maxItems,
    },
  });
}
