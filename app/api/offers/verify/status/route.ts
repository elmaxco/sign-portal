import { NextRequest, NextResponse } from "next/server";
import {
  OFFER_VERIFICATION_COOKIE_NAME,
  verifyOfferVerificationToken,
} from "@/lib/offer-verification";

export const dynamic = "force-dynamic";

function maskPersonalNumber(value: string) {
  if (!value) {
    return "";
  }

  const compact = value.replace(/\s/g, "");

  if (compact.length <= 4) {
    return compact;
  }

  return `****${compact.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(OFFER_VERIFICATION_COOKIE_NAME)?.value || "";
  const verified = verifyOfferVerificationToken(token);

  if (!verified) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({
    verified: true,
    identity: {
      fullName: verified.fullName,
      personalNumberMasked: maskPersonalNumber(verified.personalNumber),
      provider: verified.provider,
      verifiedAtMs: verified.verifiedAtMs,
    },
  });
}
