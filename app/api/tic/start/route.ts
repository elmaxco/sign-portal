import { NextRequest, NextResponse } from "next/server";
import { buildHostedModeUrlServer, getHostedBaseUrl } from "@/lib/idtic";

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

  const callbackUrl = new URL("/api/tic/callback", request.nextUrl.origin);

  if (body.redirectUrl) {
    callbackUrl.searchParams.set("next", body.redirectUrl);
  }

  const hostedUrl = buildHostedModeUrlServer({
    hostedBaseUrl,
    token,
    callbackUrl: callbackUrl.toString(),
  });

  if (!hostedUrl) {
    return NextResponse.json({ error: "Invalid TIC_HOSTED_BASE_URL." }, { status: 500 });
  }

  return NextResponse.json({ redirectUrl: hostedUrl });
}
