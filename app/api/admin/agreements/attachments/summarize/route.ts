import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireAdminAuth } from "@/lib/admin-auth";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";
import {
  extractPdfTextForSummary,
  generateAgreementSummaryFromText,
} from "@/lib/agreement-content-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  const ip = getClientIp(request);
  const ipRate = await consumeRateLimit({
    namespace: "agreement_pdf_summarize_ip",
    key: ip,
    windowMs: 60_000,
    maxHits: 10,
  });

  if (!ipRate.allowed) {
    return NextResponse.json(
      { error: "För många sammanfattningar. Vänta en stund." },
      { status: 429, headers: { "Retry-After": String(ipRate.retryAfterSeconds) } },
    );
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const contentType = (file.type || "").toLowerCase();

  if (contentType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF is supported for summary." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File size must be between 1 byte and ${MAX_ATTACHMENT_SIZE_BYTES} bytes.` },
      { status: 400 },
    );
  }

  try {
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractPdfTextForSummary(pdfBuffer);
    const result = await generateAgreementSummaryFromText(extractedText);

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      sourceChars: extractedText.length,
      usedInputChars: result.usedInputChars,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not summarize PDF.";
    const status = message.includes("GEMINI_API_KEY") ? 503 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
