import { NextRequest, NextResponse } from "next/server";
import { getAgreementLifecycleByTokenServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
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

  return NextResponse.json(
    {
      status: lifecycle.status,
      ticStartedAtMs: lifecycle.ticStartedAtMs,
      ticState: lifecycle.ticState || null,
      signedAt: lifecycle.signedAt ?? null,
      signProvider: lifecycle.signProvider ?? null,
    },
    { headers: NO_STORE_HEADERS },
  );
}
