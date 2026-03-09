import { NextResponse } from "next/server";
import { listLatestOffersServer } from "@/lib/offers-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const offers = await listLatestOffersServer();
  return NextResponse.json({ offers });
}
