type JsonObject = Record<string, unknown>;

type CollectOutcome = "success" | "failed" | "pending" | "unknown";

function normalizeValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function collectStringCandidates(node: unknown, output: string[]) {
  if (!node) {
    return;
  }

  if (typeof node === "string") {
    output.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectStringCandidates(item, output);
    }
    return;
  }

  if (typeof node === "object") {
    const objectNode = node as JsonObject;

    const interestingKeys = [
      "status",
      "progressStatus",
      "progress_status",
      "result",
      "outcome",
      "state",
      "collectStatus",
      "collect_status",
    ];

    for (const key of interestingKeys) {
      if (key in objectNode) {
        collectStringCandidates(objectNode[key], output);
      }
    }

    for (const value of Object.values(objectNode)) {
      if (value && typeof value === "object") {
        collectStringCandidates(value, output);
      }
    }
  }
}

function classifyOutcome(values: string[]): CollectOutcome {
  const normalized = values.map(normalizeValue).filter(Boolean);

  if (
    normalized.some((value) =>
      ["complete", "completed", "success", "succeeded", "ok", "signed"].includes(value),
    )
  ) {
    return "success";
  }

  if (
    normalized.some((value) =>
      ["failed", "fail", "error", "denied", "cancelled", "canceled", "rejected"].includes(
        value,
      ),
    )
  ) {
    return "failed";
  }

  if (
    normalized.some((value) =>
      ["pending", "started", "running", "in_progress", "processing", "collecting"].includes(
        value,
      ),
    )
  ) {
    return "pending";
  }

  return "unknown";
}

export function getTicApiBaseUrl() {
  return process.env.TIC_API_BASE_URL || "https://id.tic.io/api/v1";
}

export function getTicInstanceId() {
  const explicit = process.env.TIC_INSTANCE_ID || process.env.TIC_INSTANS_ID;

  if (explicit) {
    return explicit;
  }

  const hostedUrl = process.env.TIC_HOSTED_URL || process.env.TIC_HOSTED_BASE_URL;

  if (!hostedUrl) {
    return "";
  }

  try {
    const parsed = new URL(hostedUrl);
    const [firstSegment] = parsed.pathname.split("/").filter(Boolean);
    return firstSegment ?? "";
  } catch {
    return "";
  }
}

export async function collectTicSession(input: { sessionId: string }) {
  const apiKey = process.env.TIC_API_KEY;
  const instanceId = getTicInstanceId();
  const baseUrl = getTicApiBaseUrl();

  if (!apiKey) {
    return {
      ok: false,
      outcome: "unknown" as CollectOutcome,
      error: "Missing TIC_API_KEY env variable.",
      raw: null as unknown,
      statusValue: "",
    };
  }

  if (!instanceId) {
    return {
      ok: false,
      outcome: "unknown" as CollectOutcome,
      error: "Missing TIC_INSTANCE_ID env variable (or derivable hosted slug).",
      raw: null as unknown,
      statusValue: "",
    };
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/${instanceId}/sessions/${encodeURIComponent(
    input.sessionId,
  )}/collect`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const candidates: string[] = [];
  collectStringCandidates(payload, candidates);
  const outcome = classifyOutcome(candidates);

  return {
    ok: response.ok,
    outcome,
    error: response.ok ? "" : `TIC collect request failed (${response.status}).`,
    raw: payload,
    statusValue: candidates[0] ?? "",
  };
}
