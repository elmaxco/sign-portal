import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildHostedModeUrlServer,
  createSignedState,
  getAppBaseUrl,
  getHostedBaseUrl,
} from "@/lib/idtic";

type StartBody = {
  redirectUrl?: string;
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: StartBody = {};

  try {
    body = (await request.json()) as StartBody;
  } catch {
    body = {};
  }

  const hostedBaseUrl = getHostedBaseUrl();

  if (!hostedBaseUrl) {
    return NextResponse.json(
      { error: "Missing TIC_HOSTED_BASE_URL env variable." },
      { status: 500 },
    );
  }

  const sessionId = `offer-${randomBytes(12).toString("hex")}`;
  const signedState = createSignedState(sessionId);

  if (!signedState) {
    return NextResponse.json(
      { error: "Missing TIC_STATE_SECRET or TIC_WEBHOOK_SECRET env variable." },
      { status: 500 },
    );
  }

  const appBaseUrl = getAppBaseUrl(request.nextUrl.origin);
  const callbackUrl = new URL("/api/tic/callback", appBaseUrl);
  callbackUrl.searchParams.set("flow", "offer");

  if (body.redirectUrl?.trim()) {
    try {
      const nextParsed = new URL(body.redirectUrl);
      const appParsed = new URL(appBaseUrl);

      if (nextParsed.origin === appParsed.origin) {
        callbackUrl.searchParams.set("next", body.redirectUrl);
      }
    } catch {
      /* ignore invalid redirectUrl */
    }
  }

  const hostedUrl = buildHostedModeUrlServer({
    hostedBaseUrl,
    state: signedState,
    sessionId,
    callbackUrl: callbackUrl.toString(),
  });

  if (!hostedUrl) {
    return NextResponse.json({ error: "Invalid TIC_HOSTED_BASE_URL." }, { status: 500 });
  }

  return NextResponse.json({ redirectUrl: hostedUrl });
}
