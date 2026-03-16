import { NextRequest, NextResponse } from "next/server";
import { deleteOfferByIdServer } from "@/lib/offers-server";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);

  if (authError) {
    return authError;
  }

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

  const deleted = await deleteOfferByIdServer(offerId);

  if (!deleted.ok) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deletedOfferId: deleted.offerId });
}
