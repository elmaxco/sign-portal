import pdfParse from "pdf-parse";

const DEFAULT_SUMMARY_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_INPUT_CHARS = 18_000;

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return apiKey;
}

function getSummaryModel() {
  return process.env.OPENAI_SUMMARY_MODEL?.trim() || DEFAULT_SUMMARY_MODEL;
}

function getMaxInputChars() {
  const raw = Number(process.env.OPENAI_SUMMARY_MAX_INPUT_CHARS || DEFAULT_MAX_INPUT_CHARS);

  if (!Number.isFinite(raw) || raw < 1_000) {
    return DEFAULT_MAX_INPUT_CHARS;
  }

  return Math.floor(raw);
}

export async function extractPdfTextForSummary(pdfBuffer: Buffer) {
  const parsed = await pdfParse(pdfBuffer);
  const normalized = (parsed.text || "")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

export async function generateAgreementSummaryFromText(text: string) {
  const normalized = text.trim();

  if (!normalized) {
    throw new Error("PDF contained no readable text.");
  }

  const maxChars = getMaxInputChars();
  const clipped = normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getSummaryModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Du sammanfattar osignerade avtalstexter på svenska. Skriv en saklig och kort beskrivning av vad avtalet handlar om. Returnera endast sammanfattningen i 3-5 meningar utan punktlista.",
        },
        {
          role: "user",
          content: `Skapa en kort innehållstext baserat på detta avtalsutkast:\n\n${clipped}`,
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Failed to generate summary.");
  }

  const summary = payload.choices?.[0]?.message?.content?.trim() || "";

  if (!summary) {
    throw new Error("AI returned an empty summary.");
  }

  return {
    summary,
    usedInputChars: clipped.length,
  };
}
