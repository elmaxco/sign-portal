import { NextRequest, NextResponse } from "next/server";
import {
  logAgreementEventByTokenServer,
  removeAgreementAttachmentByTokenServer,
} from "@/lib/agreements-server";
import { deleteAttachmentFromStorage } from "@/lib/attachment-storage";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);

  if (authError) {
    return authError;
  }

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

  try {
    await deleteAttachmentFromStorage(removed.storagePath);
    return NextResponse.json({ ok: true, attachmentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete file from storage.";

    await logAgreementEventByTokenServer({
      token,
      type: "attachment_storage_delete_failed",
      details: {
        attachmentId,
        storagePath: removed.storagePath,
        error: message,
      },
    });

    return NextResponse.json({
      ok: true,
      attachmentId,
      warning: "Attachment metadata removed but storage delete failed.",
      warningDetails: message,
    });
  }
}
