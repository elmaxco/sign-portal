export const MAX_ATTACHMENTS_PER_AGREEMENT = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export type AttachmentItem = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath: string;
  createdAt: string;
  uploadedBy: "admin";
};

export function isAllowedAttachmentContentType(contentType: string) {
  return ALLOWED_ATTACHMENT_CONTENT_TYPES.has(contentType.toLowerCase());
}

export function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export function formatAttachmentSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}
