import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  addAgreementAttachmentByTokenServer,
  getAgreementByTokenServer,
  removeAgreementAttachmentByTokenServer,
} from "@/lib/agreements-server";
import {
  isAllowedAttachmentContentType,
  MAX_ATTACHMENTS_PER_AGREEMENT,
  MAX_ATTACHMENT_SIZE_BYTES,
  sanitizeFilename,
} from "@/lib/attachments";
import { uploadAttachmentToStorage } from "@/lib/attachment-storage";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipRate = await consumeRateLimit({
    namespace: "attachment_upload_ip",
    key: ip,
    windowMs: 60_000,
    maxHits: 20,
  });

  if (!ipRate.allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Please wait." },
      { status: 429, headers: { "Retry-After": String(ipRate.retryAfterSeconds) } },
    );
  }

  const form = await request.formData();
  const token = String(form.get("token") || "").trim();
  const file = form.get("file");

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const agreement = await getAgreementByTokenServer(token);

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  if (agreement.attachmentCount >= MAX_ATTACHMENTS_PER_AGREEMENT) {
    return NextResponse.json(
      { error: `Max ${MAX_ATTACHMENTS_PER_AGREEMENT} attachments per agreement.` },
      { status: 400 },
    );
  }

  const filename = sanitizeFilename(file.name || "attachment");
  const contentType = (file.type || "application/octet-stream").toLowerCase();

  if (!isAllowedAttachmentContentType(contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File size must be between 1 byte and ${MAX_ATTACHMENT_SIZE_BYTES} bytes.` },
      { status: 400 },
    );
  }

  const attachmentId = randomBytes(10).toString("hex");
  const storagePath = `agreements/${agreement.id}/attachments/${attachmentId}-${filename}`;
  const createdAt = new Date().toISOString();

  const attachment = {
    id: attachmentId,
    filename,
    contentType,
    size: file.size,
    storagePath,
    createdAt,
    uploadedBy: "admin" as const,
  };

  const added = await addAgreementAttachmentByTokenServer({ token, attachment });

  if (!added.ok) {
    const reason = added.reason === "max_reached"
      ? `Max ${MAX_ATTACHMENTS_PER_AGREEMENT} attachments per agreement.`
      : "Could not register attachment metadata.";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  try {
    const data = Buffer.from(await file.arrayBuffer());
    await uploadAttachmentToStorage({
      storagePath,
      contentType,
      content: data,
    });
  } catch (error) {
    await removeAgreementAttachmentByTokenServer({ token, attachmentId });
    const message = error instanceof Error ? error.message : "Failed to upload attachment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, attachment });
}
