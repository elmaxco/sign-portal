import { NextRequest, NextResponse } from "next/server";
import { removeAgreementAttachmentByTokenServer } from "@/lib/agreements-server";
import { deleteAttachmentFromStorage } from "@/lib/attachment-storage";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  let body: { token?: string; attachmentId?: string };

  try {
    body = (await request.json()) as { token?: string; attachmentId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim() || "";
  const attachmentId = body.attachmentId?.trim() || "";

  if (!token || !attachmentId) {
    return NextResponse.json({ error: "Missing token or attachmentId." }, { status: 400 });
  }

  const removed = await removeAgreementAttachmentByTokenServer({ token, attachmentId });

  if (!removed.ok) {
    const status = removed.reason === "not_found" ? 404 : 400;
    const error = removed.reason === "not_found" ? "Agreement not found." : "Attachment not found.";
    return NextResponse.json({ error }, { status });
  }

  await deleteAttachmentFromStorage(removed.storagePath);

  return NextResponse.json({ ok: true, attachmentId });
}
