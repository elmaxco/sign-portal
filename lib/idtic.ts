import { createHmac, timingSafeEqual } from "node:crypto";

type QueryValue = string | string[] | undefined;

type CallbackQuery = Record<string, QueryValue>;

function firstValue(value: QueryValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeQuery(query: CallbackQuery) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    normalized[key] = firstValue(value);
  }

  return normalized;
}

export function getHostedBaseUrl() {
  return process.env.TIC_HOSTED_BASE_URL || process.env.TIC_HOSTED_URL || "";
}

export function getAppBaseUrl(fallbackOrigin: string) {
  const configured = process.env.APP_BASE_URL?.trim();

  if (!configured) {
    return fallbackOrigin;
  }

  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    return configured;
  }

  return `https://${configured}`;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getStateSecret() {
  return process.env.TIC_STATE_SECRET || process.env.TIC_WEBHOOK_SECRET || "";
}

export function createSignedState(token: string) {
  const secret = getStateSecret();

  if (!secret) {
    return null;
  }

  const payload = {
    token,
    ts: Date.now(),
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(payloadEncoded).digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

export function verifySignedState(state: string) {
  const secret = getStateSecret();

  if (!secret || !state) {
    return null;
  }

  const separatorIndex = state.lastIndexOf(".");

  if (separatorIndex <= 0 || separatorIndex >= state.length - 1) {
    return null;
  }

  const payloadEncoded = state.slice(0, separatorIndex);
  const signature = state.slice(separatorIndex + 1);
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
    const decoded = JSON.parse(base64UrlDecode(payloadEncoded)) as { token?: string };

    if (!decoded.token || typeof decoded.token !== "string") {
      return null;
    }

    return decoded.token;
  } catch {
    return null;
  }
}

export function buildHostedModeUrlServer(input: {
  hostedBaseUrl: string;
  state: string;
  sessionId: string;
  callbackUrl: string;
}) {
  if (!input.hostedBaseUrl) {
    return null;
  }

  try {
    const url = new URL(input.hostedBaseUrl);
    url.searchParams.set("callback", input.callbackUrl);
    url.searchParams.set("redirect_uri", input.callbackUrl);
    url.searchParams.set("state", input.state);
    url.searchParams.set("session_id", input.sessionId);

    return url.toString();
  } catch {
    return null;
  }
}

export function parseIdTicCallback(query: CallbackQuery) {
  const data = normalizeQuery(query);

  const statusValues = [
    data.status,
    data.result,
    data.outcome,
    data.sign_status,
    data.bankid_status,
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  const successByStatus = statusValues.some((value) =>
    ["ok", "success", "signed", "complete", "completed"].includes(value),
  );

  const failureByStatus = statusValues.some((value) =>
    ["error", "failed", "fail", "denied", "cancelled", "canceled"].includes(value),
  );

  const successByFlags = [data.signed, data.success, data.approved]
    .filter(Boolean)
    .some((value) => ["1", "true", "yes"].includes(value.toLowerCase()));

  return {
    isSuccess: successByStatus || successByFlags,
    isFailure: failureByStatus,
    provider: data.provider || "id.tic.io",
    proof: JSON.stringify(data),
    data,
  };
}
