import { NextRequest, NextResponse } from "next/server";
import { createAgreementServer } from "@/lib/agreements-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { title?: string; content?: string };

  try {
    body = (await request.json()) as { title?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim() || "";
  const content = body.content?.trim() || "";

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
  }

  const created = await createAgreementServer({ title, content });
  return NextResponse.json(created);
}
