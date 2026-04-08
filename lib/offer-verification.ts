import { createHmac, timingSafeEqual } from "node:crypto";

export const OFFER_VERIFICATION_COOKIE_NAME = "offer_bankid_verified";

const OFFER_VERIFICATION_MAX_AGE_MS = 15 * 60 * 1000;

type OfferVerificationPayload = {
  sessionId: string;
  provider: string;
  verifiedAtMs: number;
  fullName: string;
  personalNumber: string;
};

export type OfferVerifiedIdentity = {
  sessionId: string;
  provider: string;
  verifiedAtMs: number;
  fullName: string;
  personalNumber: string;
};

function getOfferVerificationSecret() {
  return (
    process.env.OFFER_VERIFICATION_SECRET ||
    process.env.TIC_STATE_SECRET ||
    process.env.TIC_WEBHOOK_SECRET ||
    ""
  );
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function toStringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function findFirstStringByKey(node: unknown, keyCandidates: string[]): string {
  if (!node) {
    return "";
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const value = findFirstStringByKey(item, keyCandidates);

      if (value) {
        return value;
      }
    }

    return "";
  }

  if (typeof node !== "object") {
    return "";
  }

  const record = node as Record<string, unknown>;

  for (const key of keyCandidates) {
    const value = toStringOrEmpty(record[key]);

    if (value) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nested = findFirstStringByKey(value, keyCandidates);

      if (nested) {
        return nested;
      }
    }
  }

  return "";
}

export function extractTicVerifiedIdentity(payload: unknown) {
  const fullName =
    findFirstStringByKey(payload, [
      "fullName",
      "full_name",
      "name",
      "displayName",
      "display_name",
    ]) ||
    [
      findFirstStringByKey(payload, ["givenName", "given_name", "firstName", "first_name"]),
      findFirstStringByKey(payload, ["surname", "familyName", "lastName", "last_name"]),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const personalNumber = findFirstStringByKey(payload, [
    "personalNumber",
    "personal_number",
    "ssn",
    "nationalIdentityNumber",
    "national_identity_number",
    "pnr",
    "personnummer",
  ]);

  return {
    fullName,
    personalNumber,
  };
}

export function createOfferVerificationToken(input: OfferVerificationPayload) {
  const secret = getOfferVerificationSecret();

  if (!secret) {
    return null;
  }

  const payloadEncoded = base64UrlEncode(JSON.stringify(input));
  const signature = createHmac("sha256", secret).update(payloadEncoded).digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

export function verifyOfferVerificationToken(token: string) {
  const secret = getOfferVerificationSecret();

  if (!secret || !token) {
    return null;
  }

  const separatorIndex = token.lastIndexOf(".");

  if (separatorIndex <= 0 || separatorIndex >= token.length - 1) {
    return null;
  }

  const payloadEncoded = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = createHmac("sha256", secret).update(payloadEncoded).digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as Partial<OfferVerificationPayload>;
    const verifiedAtMs = typeof parsed.verifiedAtMs === "number" ? parsed.verifiedAtMs : 0;
    const now = Date.now();

    if (!verifiedAtMs || now - verifiedAtMs > OFFER_VERIFICATION_MAX_AGE_MS) {
      return null;
    }

    const sessionId = toStringOrEmpty(parsed.sessionId);

    if (!sessionId) {
      return null;
    }

    const output: OfferVerifiedIdentity = {
      sessionId,
      provider: toStringOrEmpty(parsed.provider) || "id.tic.io",
      verifiedAtMs,
      fullName: toStringOrEmpty(parsed.fullName),
      personalNumber: toStringOrEmpty(parsed.personalNumber),
    };

    return output;
  } catch {
    return null;
  }
}

export function getOfferVerificationMaxAgeSeconds() {
  return Math.floor(OFFER_VERIFICATION_MAX_AGE_MS / 1000);
}
