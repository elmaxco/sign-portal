import { NextRequest, NextResponse } from "next/server";
import { createAgreementFromOfferServer } from "@/lib/offers-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { offerId?: string };

  try {
    body = (await request.json()) as { offerId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const offerId = body.offerId?.trim() || "";

  if (!offerId) {
    return NextResponse.json({ error: "Missing offerId." }, { status: 400 });
  }

  try {
    const agreement = await createAgreementFromOfferServer(offerId);

    if (!agreement) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, agreement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agreement from offer.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
