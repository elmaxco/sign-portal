import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementLifecycleByTokenServer,
  resetAgreementByTokenServer,
} from "@/lib/agreements-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SIGNING_TIMEOUT_MS = 5 * 60 * 1000;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const lifecycle = await getAgreementLifecycleByTokenServer(token);

  if (!lifecycle) {
    return NextResponse.json(
      { error: "Agreement not found." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  if (lifecycle.status !== "signing") {
    return NextResponse.json({ ok: true, reset: false }, { headers: NO_STORE_HEADERS });
  }

  const isTimedOut =
    typeof lifecycle.ticStartedAtMs === "number" &&
    Date.now() - lifecycle.ticStartedAtMs > SIGNING_TIMEOUT_MS;

  if (!isTimedOut) {
    return NextResponse.json({ ok: true, reset: false }, { headers: NO_STORE_HEADERS });
  }

  await resetAgreementByTokenServer({
    token,
    errorCode: "TIMEOUT",
    errorMessage: "Tiden gick ut. Försök igen.",
  });

  return NextResponse.json({ ok: true, reset: true }, { headers: NO_STORE_HEADERS });
}
