import { NextRequest, NextResponse } from "next/server";
import {
  getAgreementByTokenServer,
  logAgreementEventByTokenServer,
} from "@/lib/agreements-server";
import { createAttachmentDownloadUrl } from "@/lib/attachment-storage";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const attachmentId = request.nextUrl.searchParams.get("attachmentId")?.trim() || "";
  const intent = request.nextUrl.searchParams.get("intent")?.trim() || "download";
  const pageParam = request.nextUrl.searchParams.get("page")?.trim() || "";

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

  if (intent !== "preview") {
    await logAgreementEventByTokenServer({
      token,
      type: "attachment_downloaded",
      details: {
        attachmentId,
        filename: attachment.filename,
        ip,
      },
    });
  }

  if (intent === "preview") {
    const parsedPage = Number.parseInt(pageParam, 10);
    const hasValidPage = Number.isFinite(parsedPage) && parsedPage > 0;
    const previewUrl = hasValidPage
      ? `${signedUrl}#page=${parsedPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
      : `${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

    return NextResponse.redirect(previewUrl, { status: 302 });
  }

  return NextResponse.redirect(signedUrl, { status: 302 });
}
