import { NextRequest, NextResponse } from "next/server";
import { resetTimedOutSigningsServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AGREEMENTS_CLEANUP_SECRET;

  if (expectedSecret) {
    const providedSecret = request.headers.get("x-cron-secret");

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const timeoutMs = Number(request.nextUrl.searchParams.get("timeoutMs") || DEFAULT_TIMEOUT_MS);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return NextResponse.json({ error: "Invalid timeoutMs." }, { status: 400 });
  }

  const result = await resetTimedOutSigningsServer({ timeoutMs });

  return NextResponse.json({
    ok: true,
    checked: result.checked,
    reset: result.reset,
    timeoutMs,
  });
}
