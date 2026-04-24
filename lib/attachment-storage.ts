import { getAdminBucket } from "@/lib/firebase-admin";

export async function uploadAttachmentToStorage(input: {
  storagePath: string;
  contentType: string;
  content: Buffer;
}) {
  const bucket = getAdminBucket();
  const file = bucket.file(input.storagePath);

  await file.save(input.content, {
    resumable: false,
    metadata: {
      contentType: input.contentType,
      cacheControl: "private, max-age=0, no-store",
    },
  });
}

export async function deleteAttachmentFromStorage(storagePath: string) {
  const bucket = getAdminBucket();
  const file = bucket.file(storagePath);

  try {
    await file.delete({ ignoreNotFound: true });
  } catch {
    await file.delete({ ignoreNotFound: true });
  }
}

export async function createAttachmentDownloadUrl(input: {
  storagePath: string;
  expiresInMinutes?: number;
}) {
  const bucket = getAdminBucket();
  const file = bucket.file(input.storagePath);
  const expiresInMinutes = Math.max(1, Math.min(input.expiresInMinutes ?? 5, 15));

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return url;
}

export async function readAttachmentFromStorage(storagePath: string) {
  const bucket = getAdminBucket();
  const file = bucket.file(storagePath);
  const [content] = await file.download();
  return content;
}
