import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementByTokenServer,
  markAgreementFailedByTicStateServer,
  markAgreementSignedByTicStateServer,
} from "@/lib/agreements-server";
import { parseIdTicCallback, verifySignedState } from "@/lib/idtic";
import {
  sendAdminAgreementSignedNoticeEmail,
  sendAgreementSignedConfirmationEmail,
} from "@/lib/mail";
import { collectTicAuthSession, ticDebugLog } from "@/lib/tic-collect";
import {
  createOfferVerificationToken,
  extractTicVerifiedIdentity,
  getOfferVerificationMaxAgeSeconds,
  OFFER_VERIFICATION_COOKIE_NAME,
} from "@/lib/offer-verification";

function toQueryObject(searchParams: URLSearchParams) {
  const output: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    output[key] = value;
  }

  return output;
}

function safeNextUrl(request: NextRequest, token: string) {
  const fallback = new URL(`/signup/${token}`, request.nextUrl.origin);
  const nextValue = request.nextUrl.searchParams.get("next");

  if (!nextValue) {
    return fallback;
  }

  try {
    const parsed = new URL(nextValue);

    if (parsed.origin !== request.nextUrl.origin) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function safeOfferNextUrl(request: NextRequest) {
  const fallback = new URL("/offer", request.nextUrl.origin);
  const nextValue = request.nextUrl.searchParams.get("next");

  if (!nextValue) {
    return fallback;
  }

  try {
    const parsed = new URL(nextValue);

    if (parsed.origin !== request.nextUrl.origin) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
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

export async function GET(request: NextRequest) {
  return handleCallback(request, toQueryObject(request.nextUrl.searchParams));
}

export async function POST(request: NextRequest) {
  let body: Record<string, string> = {};

  try {
    const json = (await request.json()) as Record<string, unknown>;

    body = Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch {
    body = {};
  }

  const query = {
    ...toQueryObject(request.nextUrl.searchParams),
    ...body,
  };

  return handleCallback(request, query);
}

async function handleCallback(request: NextRequest, query: Record<string, string>) {
  const parsed = parseIdTicCallback(query);
  const state = parsed.data.state ?? "";
  const verifiedToken = verifySignedState(state);
  const token = verifiedToken || parsed.data.session_id;
  const sessionId = parsed.data.session_id || parsed.data.sessionId || "";
  const callbackResult = parsed.data.result || parsed.data.status || "";
  const flow = parsed.data.flow || request.nextUrl.searchParams.get("flow") || "";
  const isOfferFlow =
    flow.toLowerCase() === "offer" ||
    (verifiedToken ? verifiedToken.startsWith("offer-") : false) ||
    sessionId.startsWith("offer-");

  if (isOfferFlow) {
    const redirectTarget = safeOfferNextUrl(request);

    if (!verifiedToken) {
      redirectTarget.searchParams.set("bankid", "invalid_state");
      return NextResponse.redirect(redirectTarget);
    }

    const effectiveSessionId = sessionId || verifiedToken;

    if (!effectiveSessionId) {
      redirectTarget.searchParams.set("bankid", parsed.isFailure ? "failed" : "pending");
      return NextResponse.redirect(redirectTarget);
    }

    const collect = await collectTicAuthSession({ sessionId: effectiveSessionId });

    ticDebugLog("Offer collect result (shared callback)", {
      ok: collect.ok,
      outcome: collect.outcome,
      error: collect.error,
      statusValue: collect.statusValue,
    });

    if (collect.ok && collect.outcome === "success") {
      const identity = extractTicVerifiedIdentity(collect.raw);
      const verificationToken = createOfferVerificationToken({
        sessionId: effectiveSessionId,
        provider: parsed.provider,
        verifiedAtMs: Date.now(),
        fullName: identity.fullName,
        personalNumber: identity.personalNumber,
      });

      if (!verificationToken) {
        redirectTarget.searchParams.set("bankid", "failed");
        return NextResponse.redirect(redirectTarget);
      }

      redirectTarget.searchParams.set("bankid", "success");
      const response = NextResponse.redirect(redirectTarget);
      response.cookies.set(OFFER_VERIFICATION_COOKIE_NAME, verificationToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: getOfferVerificationMaxAgeSeconds(),
      });

      return response;
    }

    redirectTarget.searchParams.set(
      "bankid",
      collect.outcome === "failed" || parsed.isFailure ? "failed" : "pending",
    );

    const response = NextResponse.redirect(redirectTarget);
    response.cookies.delete(OFFER_VERIFICATION_COOKIE_NAME);
    return response;
  }

  if (!token) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  if (!verifiedToken) {
    const redirectTarget = safeNextUrl(request, token);
    redirectTarget.searchParams.set("bankid", "invalid_state");
    return NextResponse.redirect(redirectTarget);
  }

  const redirectTarget = safeNextUrl(request, token);

  if (!sessionId) {
    if (parsed.isFailure) {
      redirectTarget.searchParams.set("bankid", "failed");
      return NextResponse.redirect(redirectTarget);
    }

    redirectTarget.searchParams.set("bankid", "pending");
    return NextResponse.redirect(redirectTarget);
  }

  const collect = await collectTicAuthSession({ sessionId });

  ticDebugLog("Collect result", {
    ok: collect.ok,
    outcome: collect.outcome,
    error: collect.error,
    statusValue: collect.statusValue,
  });

  if (collect.ok && collect.outcome === "success") {
    const updated = await markAgreementSignedByTicStateServer({
      ticState: state,
      signProvider: parsed.provider,
      sessionId,
      result: collect.statusValue || callbackResult || "complete",
      callbackData: parsed.data,
      collectData: collect.raw,
    });

    if (!updated) {
      redirectTarget.searchParams.set("bankid", "agreement_not_found");
      return NextResponse.redirect(redirectTarget);
    }

    const agreement = await getAgreementByTokenServer(token);

    if (agreement) {
      const rawBaseUrl = process.env.APP_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
      const baseUrl = getAbsoluteBaseUrl(rawBaseUrl, request.nextUrl.origin);
      const signUrl = new URL(`/signup/${agreement.token}`, baseUrl).toString();
      const adminNotifyEmail =
        process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_ADMIN_NOTIFY_TO || "";

      const emailTasks: Array<Promise<unknown>> = [];

      if (agreement.recipientEmail) {
        emailTasks.push(
          sendAgreementSignedConfirmationEmail({
            to: agreement.recipientEmail,
            agreementTitle: agreement.title,
            signUrl,
          }),
        );
      }

      if (adminNotifyEmail.trim()) {
        emailTasks.push(
          sendAdminAgreementSignedNoticeEmail({
            to: adminNotifyEmail.trim(),
            agreementTitle: agreement.title,
            recipientEmail: agreement.recipientEmail || "(saknas)",
            signUrl,
          }),
        );
      }

      if (emailTasks.length > 0) {
        const emailResults = await Promise.allSettled(emailTasks);
        const failedResults = emailResults.filter((result) => result.status === "rejected");

        if (failedResults.length > 0) {
          console.error("Signed notification emails failed:", failedResults);
        }
      }
    }

    redirectTarget.searchParams.set("bankid", "success");
    return NextResponse.redirect(redirectTarget);
  }

  if (collect.outcome === "failed" || parsed.isFailure) {
    await markAgreementFailedByTicStateServer({
      ticState: state,
      errorCode: collect.statusValue || "FAILED",
      errorMessage: collect.error || "Signering misslyckades eller avbröts.",
    });

    redirectTarget.searchParams.set("bankid", "failed");
    return NextResponse.redirect(redirectTarget);
  }

  redirectTarget.searchParams.set("bankid", "pending");
  return NextResponse.redirect(redirectTarget);
}
