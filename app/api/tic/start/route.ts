import { NextRequest, NextResponse } from "next/server";
import {
  buildHostedModeUrlServer,
  createSignedState,
  getAppBaseUrl,
  getHostedBaseUrl,
} from "@/lib/idtic";

type StartBody = {
  token?: string;
  redirectUrl?: string;
};

export async function POST(request: NextRequest) {
  let body: StartBody;

  try {
    body = (await request.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const hostedBaseUrl = getHostedBaseUrl();

  if (!hostedBaseUrl) {
    return NextResponse.json(
      { error: "Missing TIC_HOSTED_BASE_URL env variable." },
      { status: 500 },
    );
  }

  const state = createSignedState(token);

  if (!state) {
    return NextResponse.json(
      { error: "Missing TIC_STATE_SECRET or TIC_WEBHOOK_SECRET env variable." },
      { status: 500 },
    );
  }

  const appBaseUrl = getAppBaseUrl(request.nextUrl.origin);

  const callbackUrl = new URL("/api/tic/callback", appBaseUrl);

  if (body.redirectUrl) {
    callbackUrl.searchParams.set("next", body.redirectUrl);
  }

  const hostedUrl = buildHostedModeUrlServer({
    hostedBaseUrl,
    state,
    sessionId: token,
    callbackUrl: callbackUrl.toString(),
  });

  if (!hostedUrl) {
    return NextResponse.json({ error: "Invalid TIC_HOSTED_BASE_URL." }, { status: 500 });
  }

  return NextResponse.json({ redirectUrl: hostedUrl });
}
