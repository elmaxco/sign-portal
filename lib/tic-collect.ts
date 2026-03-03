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

async function requestJson(input: { endpoint: string; apiKey: string; method: "GET" | "POST" }) {
  const response = await fetch(input.endpoint, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    statusCode: response.status,
    payload,
  };
}

export async function collectTicAuthSession(input: { sessionId: string }) {
  const apiKey = process.env.TIC_API_KEY;
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

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const encodedSessionId = encodeURIComponent(input.sessionId);

  const pollEndpoint = `${normalizedBaseUrl}/auth/${encodedSessionId}/poll`;
  const poll = await requestJson({ endpoint: pollEndpoint, apiKey, method: "POST" });

  const pollCandidates: string[] = [];
  collectStringCandidates(poll.payload, pollCandidates);
  const pollOutcome = classifyOutcome(pollCandidates);

  if (poll.ok && pollOutcome !== "unknown") {
    return {
      ok: true,
      outcome: pollOutcome,
      error: "",
      raw: poll.payload,
      statusValue: pollCandidates[0] ?? "",
    };
  }

  const collectEndpoint = `${normalizedBaseUrl}/auth/${encodedSessionId}/collect`;
  const collect = await requestJson({ endpoint: collectEndpoint, apiKey, method: "GET" });

  const collectCandidates: string[] = [];
  collectStringCandidates(collect.payload, collectCandidates);
  const collectOutcome = classifyOutcome(collectCandidates);

  if (collect.ok && collectOutcome !== "unknown") {
    return {
      ok: true,
      outcome: collectOutcome,
      error: "",
      raw: collect.payload,
      statusValue: collectCandidates[0] ?? "",
    };
  }

  const fallbackOutcome = pollOutcome !== "unknown" ? pollOutcome : collectOutcome;

  return {
    ok: poll.ok || collect.ok,
    outcome: fallbackOutcome,
    error:
      poll.ok || collect.ok
        ? ""
        : `TIC auth poll/collect request failed (${poll.statusCode}/${collect.statusCode}).`,
    raw: collect.payload ?? poll.payload,
    statusValue: collectCandidates[0] ?? pollCandidates[0] ?? "",
  };
}
