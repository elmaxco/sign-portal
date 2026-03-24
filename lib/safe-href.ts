/**
 * Only http(s) absolute URLs are allowed in user-facing links.
 * Blocks javascript:, data:, vbscript:, etc.
 */
export function isSafeAbsoluteHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
