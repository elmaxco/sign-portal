import { NextRequest, NextResponse } from "next/server";
import { getAgreementByTokenServer } from "@/lib/agreements-server";
import { createAttachmentDownloadUrl } from "@/lib/attachment-storage";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const attachmentId = request.nextUrl.searchParams.get("attachmentId")?.trim() || "";
  const intent = request.nextUrl.searchParams.get("intent")?.trim() || "download";

  if (!token || !attachmentId) {
    return NextResponse.json({ error: "Missing token or attachmentId." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rate = await consumeRateLimit({
    namespace: "attachment_download_token_ip",
    key: `${token}:${ip}`,
    windowMs: 60_000,
    maxHits: 30,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "För många nedladdningar. Vänta en stund." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const agreement = await getAgreementByTokenServer(token);

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  const attachment = agreement.attachments?.find((item) => item.id === attachmentId);

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const signedUrl = await createAttachmentDownloadUrl({
    storagePath: attachment.storagePath,
    expiresInMinutes: 5,
  });

  // Admin preview/download does not need to be logged to the signer audit trail.
  void intent;

  return NextResponse.redirect(signedUrl, { status: 302 });
}

