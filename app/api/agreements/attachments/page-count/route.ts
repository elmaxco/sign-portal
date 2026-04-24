import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getAgreementByTokenServer } from "@/lib/agreements-server";
import { readAttachmentFromStorage } from "@/lib/attachment-storage";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const attachmentId = request.nextUrl.searchParams.get("attachmentId")?.trim() || "";

  if (!token || !attachmentId) {
    return NextResponse.json({ error: "Missing token or attachmentId." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rate = await consumeRateLimit({
    namespace: "attachment_page_count_token_ip",
    key: `${token}:${ip}`,
    windowMs: 60_000,
    maxHits: 20,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "För många förfrågningar. Vänta en stund." },
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

  if (attachment.contentType !== "application/pdf") {
    return NextResponse.json({ error: "Attachment is not a PDF." }, { status: 400 });
  }

  try {
    const pdfBuffer = await readAttachmentFromStorage(attachment.storagePath);
    const parser = new PDFParse({ data: pdfBuffer });

    try {
      const info = await parser.getInfo();
      const totalPages = Math.max(1, Number(info.total || 1));

      return NextResponse.json({
        ok: true,
        attachmentId,
        totalPages,
      });
    } finally {
      await parser.destroy();
    }
  } catch {
    return NextResponse.json({ error: "Kunde inte läsa PDF-sidor." }, { status: 500 });
  }
}
