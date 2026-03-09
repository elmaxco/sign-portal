import { NextRequest, NextResponse } from "next/server";
import { createOfferServer } from "@/lib/offers-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    company?: string;
    orgNumber?: string;
    phone?: string;
    packageName?: string;
    notes?: string;
  };

  try {
    body = (await request.json()) as {
      name?: string;
      email?: string;
      company?: string;
      orgNumber?: string;
      phone?: string;
      packageName?: string;
      notes?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const company = body.company?.trim() || "";
  const orgNumber = body.orgNumber?.trim() || "";
  const phone = body.phone?.trim() || "";

  if (!name || !email || !company || !orgNumber || !phone) {
    return NextResponse.json(
      { error: "name, email, company, orgNumber and phone are required." },
      { status: 400 },
    );
  }

  const created = await createOfferServer({
    name,
    email,
    company,
    orgNumber,
    phone,
    packageName: body.packageName?.trim() || "",
    notes: body.notes?.trim() || "",
  });

  return NextResponse.json({ ok: true, id: created.id });
}
