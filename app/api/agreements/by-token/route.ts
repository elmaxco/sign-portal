import { NextRequest, NextResponse } from "next/server";
import { getAgreementByTokenServer } from "@/lib/agreements-server";

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

  const agreement = await getAgreementByTokenServer(token);

  if (!agreement) {
    return NextResponse.json(
      { error: "Agreement not found." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ agreement }, { headers: NO_STORE_HEADERS });
}
