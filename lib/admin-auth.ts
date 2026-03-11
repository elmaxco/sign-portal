import { NextRequest, NextResponse } from "next/server";

const ADMIN_BASIC_USERNAME = process.env.ADMIN_BASIC_USERNAME || process.env.BASIC_AUTH_USER;
const ADMIN_BASIC_PASSWORD = process.env.ADMIN_BASIC_PASSWORD || process.env.BASIC_AUTH_PASS;

function isAdminAuthConfigured() {
  return Boolean(ADMIN_BASIC_USERNAME && ADMIN_BASIC_PASSWORD);
}

function hasValidAdminBasicAuth(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Basic ")) {
    return false;
  }

  try {
    const encoded = header.slice(6);
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return false;
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    return username === ADMIN_BASIC_USERNAME && password === ADMIN_BASIC_PASSWORD;
  } catch {
    return false;
  }
}

export function requireAdminAuth(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: "Admin auth is not configured." }, { status: 503 });
  }

  if (!hasValidAdminBasicAuth(request)) {
    return NextResponse.json(
      { error: "Authentication required." },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
        },
      },
    );
  }

  return null;
}
