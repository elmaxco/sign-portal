import { NextRequest, NextResponse } from "next/server";
import { collectTicAuthSession, ticDebugLog } from "@/lib/tic-collect";
import { parseIdTicCallback, verifySignedState } from "@/lib/idtic";
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

function safeNextUrl(request: NextRequest) {
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

async function collectWithRetry(sessionId: string) {
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const collect = await collectTicAuthSession({ sessionId });

    if (!collect.ok || collect.outcome === "success" || collect.outcome === "failed") {
      return collect;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  return collectTicAuthSession({ sessionId });
}

export const dynamic = "force-dynamic";

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
  const redirectTarget = safeNextUrl(request);
  const state = parsed.data.state ?? "";
  const verifiedSessionFromState = verifySignedState(state);

  if (!verifiedSessionFromState) {
    redirectTarget.searchParams.set("bankid", "invalid_state");
    return NextResponse.redirect(redirectTarget);
  }

  const sessionId =
    parsed.data.session_id ||
    parsed.data.sessionId ||
    verifiedSessionFromState ||
    "";

  if (!sessionId) {
    redirectTarget.searchParams.set("bankid", parsed.isFailure ? "failed" : "pending");
    return NextResponse.redirect(redirectTarget);
  }

  const collect = await collectWithRetry(sessionId);

  ticDebugLog("Offer collect result", {
    ok: collect.ok,
    outcome: collect.outcome,
    error: collect.error,
    statusValue: collect.statusValue,
  });

  if (collect.ok && collect.outcome === "success") {
    const identity = extractTicVerifiedIdentity(collect.raw);
    const token = createOfferVerificationToken({
      sessionId,
      provider: parsed.provider,
      verifiedAtMs: Date.now(),
      fullName: identity.fullName,
      personalNumber: identity.personalNumber,
    });

    if (!token) {
      redirectTarget.searchParams.set("bankid", "failed");
      return NextResponse.redirect(redirectTarget);
    }

    redirectTarget.searchParams.set("bankid", "success");

    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set(OFFER_VERIFICATION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getOfferVerificationMaxAgeSeconds(),
    });

    return response;
  }

  redirectTarget.searchParams.set("bankid", collect.outcome === "failed" || parsed.isFailure ? "failed" : "pending");

  const response = NextResponse.redirect(redirectTarget);
  response.cookies.delete(OFFER_VERIFICATION_COOKIE_NAME);
  return response;
}
