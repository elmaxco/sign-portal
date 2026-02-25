import { NextRequest, NextResponse } from "next/server";
import { markAgreementSignedByToken } from "@/lib/agreements";
import { parseIdTicCallback } from "@/lib/idtic";

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
  const query = toQueryObject(request.nextUrl.searchParams);
  const parsed = parseIdTicCallback(query);
  const token = parsed.data.state || parsed.data.session_id;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  const redirectTarget = safeNextUrl(request, token);

  if (parsed.isSuccess) {
    await markAgreementSignedByToken({
      token,
      signProvider: parsed.provider,
      signProof: parsed.proof,
    });

    redirectTarget.searchParams.set("bankid", "success");
    return NextResponse.redirect(redirectTarget);
  }

  if (parsed.isFailure) {
    redirectTarget.searchParams.set("bankid", "failed");
    return NextResponse.redirect(redirectTarget);
  }

  redirectTarget.searchParams.set("bankid", "unknown");
  return NextResponse.redirect(redirectTarget);
}
