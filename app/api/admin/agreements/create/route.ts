import { NextRequest, NextResponse } from "next/server";
import { createAgreementServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { title?: string; content?: string; recipientEmail?: string };

  try {
    body = (await request.json()) as { title?: string; content?: string; recipientEmail?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim() || "";
  const content = body.content?.trim() || "";
  const recipientEmail = body.recipientEmail?.trim().toLowerCase() || "";

  if (!title || !content || !recipientEmail) {
    return NextResponse.json(
      { error: "Title, content and recipientEmail are required." },
      { status: 400 },
    );
  }

  const created = await createAgreementServer({
    title,
    content,
    recipientEmail,
  });

  return NextResponse.json(created);
}
