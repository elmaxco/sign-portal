import { PDFParse } from "pdf-parse";

const DEFAULT_SUMMARY_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_INPUT_CHARS = 18_000;

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return apiKey;
}

function getSummaryModel() {
  return process.env.GEMINI_SUMMARY_MODEL?.trim() || DEFAULT_SUMMARY_MODEL;
}

function getMaxInputChars() {
  const raw = Number(process.env.GEMINI_SUMMARY_MAX_INPUT_CHARS || DEFAULT_MAX_INPUT_CHARS);

  if (!Number.isFinite(raw) || raw < 1_000) {
    return DEFAULT_MAX_INPUT_CHARS;
  }

  return Math.floor(raw);
}

export async function extractPdfTextForSummary(pdfBuffer: Buffer) {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const parsed = await parser.getText();
    const normalized = (parsed.text || "")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return normalized;
  } finally {
    await parser.destroy();
  }
}

export async function generateAgreementSummaryFromText(text: string) {
  const normalized = text.trim();

  if (!normalized) {
    throw new Error("PDF contained no readable text.");
  }

  const maxChars = getMaxInputChars();
  const clipped = normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;

  const model = encodeURIComponent(getSummaryModel());
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(getGeminiApiKey())}`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Du sammanfattar osignerade avtalstexter på svenska. Skriv en saklig och kort beskrivning av vad avtalet handlar om. Returnera endast sammanfattningen i 3-5 meningar utan punktlista.",
            },
            {
              text: `Skapa en kort innehållstext baserat på detta avtalsutkast:\n\n${clipped}`,
            },
          ],
        },
      ],
    }),
  },
  );

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Failed to generate summary.");
  }

  const summary =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  if (!summary) {
    throw new Error("AI returned an empty summary.");
  }

  return {
    summary,
    usedInputChars: clipped.length,
  };
}
