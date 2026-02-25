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
  return process.env.TIC_HOSTED_BASE_URL ?? "";
}

export function buildHostedModeUrlServer(input: {
  hostedBaseUrl: string;
  token: string;
  callbackUrl: string;
}) {
  if (!input.hostedBaseUrl) {
    return null;
  }

  try {
    const url = new URL(input.hostedBaseUrl);
    url.searchParams.set("callback", input.callbackUrl);
    url.searchParams.set("redirect_uri", input.callbackUrl);
    url.searchParams.set("state", input.token);
    url.searchParams.set("session_id", input.token);

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
