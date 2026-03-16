import { NextRequest, NextResponse } from "next/server";
import { deleteAgreementByTokenServer } from "@/lib/agreements-server";
import { deleteAttachmentFromStorage } from "@/lib/attachment-storage";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);

  if (authError) {
    return authError;
  }

  let body: { token?: string };

  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim() || "";

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const deleted = await deleteAgreementByTokenServer(token);

  if (!deleted.ok) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  const storageDeleteErrors: string[] = [];

  for (const storagePath of deleted.attachmentStoragePaths) {
    try {
      await deleteAttachmentFromStorage(storagePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage delete error";
      storageDeleteErrors.push(`${storagePath}: ${message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedAgreementId: deleted.agreementId,
    storageDeleteErrors,
  });
}
