import { NextRequest, NextResponse } from "next/server";
import { markAgreementSignedByTicState } from "@/lib/agreements";
import { parseIdTicCallback, verifySignedState } from "@/lib/idtic";
import { collectTicAuthSession } from "@/lib/tic-collect";

function toQueryObject(searchParams: URLSearchParams) {
  const output: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    output[key] = value;
  }

  return output;
}

function safeNextUrl(request: NextRequest, token: string) {
  const fallback = new URL(`/sign/${token}`, request.nextUrl.origin);
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

  console.log("TIC collect:", {
    ok: collect.ok,
    outcome: collect.outcome,
    error: collect.error,
    statusValue: collect.statusValue,
    raw: collect.raw,
  });

  if (collect.ok && collect.outcome === "success") {
    const updated = await markAgreementSignedByTicState({
      ticState: state,
      signProvider: parsed.provider,
      sessionId,
      result: collect.statusValue || callbackResult || "complete",
    });

    if (!updated) {
      redirectTarget.searchParams.set("bankid", "agreement_not_found");
      return NextResponse.redirect(redirectTarget);
    }

    redirectTarget.searchParams.set("bankid", "success");
    return NextResponse.redirect(redirectTarget);
  }

  if (collect.outcome === "failed" || parsed.isFailure) {
    redirectTarget.searchParams.set("bankid", "failed");
    return NextResponse.redirect(redirectTarget);
  }

  redirectTarget.searchParams.set("bankid", "pending");
  return NextResponse.redirect(redirectTarget);
}
