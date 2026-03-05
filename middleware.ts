import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const ADMIN_BASIC_USERNAME = process.env.ADMIN_BASIC_USERNAME || process.env.BASIC_AUTH_USER;
const ADMIN_BASIC_PASSWORD = process.env.ADMIN_BASIC_PASSWORD || process.env.BASIC_AUTH_PASS;

function isMaintenanceExempt(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/manifest")
  );
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
    },
  });
}

function missingAdminAuthConfigResponse() {
  return new NextResponse("Admin auth is not configured.", {
    status: 503,
  });
}

function isAdminAuthConfigured() {
  return Boolean(ADMIN_BASIC_USERNAME && ADMIN_BASIC_PASSWORD);
}

function hasValidAdminBasicAuth(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Basic ")) {
    return false;
  }

  const encoded = header.slice(6);

  try {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE && !isMaintenanceExempt(pathname)) {
    const maintenanceUrl = new URL("/maintenance", request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  if (isAdminPath(pathname)) {
    if (!isAdminAuthConfigured()) {
      return missingAdminAuthConfigResponse();
    }

    if (!hasValidAdminBasicAuth(request)) {
      return unauthorizedResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
