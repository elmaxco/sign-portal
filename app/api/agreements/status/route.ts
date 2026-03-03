import { NextRequest, NextResponse } from "next/server";
import { getAgreementStatusByTokenServer } from "@/lib/agreements-server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const agreement = await getAgreementStatusByTokenServer(token);

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: agreement.status,
    signedAt: agreement.signedAt ?? null,
    signProvider: agreement.signProvider ?? null,
  });
}