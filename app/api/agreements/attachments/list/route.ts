import { NextRequest, NextResponse } from "next/server";
import { getAgreementByTokenServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const agreement = await getAgreementByTokenServer(token);

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    attachments: agreement.attachments,
    attachmentCount: agreement.attachmentCount,
  });
}
