import { NextResponse } from "next/server";
import { listLatestAgreementsServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const agreements = await listLatestAgreementsServer();
  return NextResponse.json({ agreements });
}
