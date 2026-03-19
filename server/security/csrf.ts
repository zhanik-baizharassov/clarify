import { NextResponse } from "next/server";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request) {
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const host =
    forwardedHost || req.headers.get("host")?.split(",")[0]?.trim();

  if (!host) return null;

  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return normalizeOrigin(`${proto}://${host}`);
}

function getConfiguredAppOrigin() {
  return normalizeOrigin(process.env.APP_ORIGIN);
}

function getAllowedOrigins(req: Request) {
  const allowed = new Set<string>();
  const appOrigin = getConfiguredAppOrigin();

  if (isProduction()) {
    if (appOrigin) {
      allowed.add(appOrigin);
    }
    return allowed;
  }

  if (appOrigin) {
    allowed.add(appOrigin);
  }

  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin) {
    allowed.add(requestOrigin);
  }

  return allowed;
}

export function enforceSameOrigin(req: Request) {
  if (isProduction() && !getConfiguredAppOrigin()) {
    return NextResponse.json(
      { error: "CSRF protection is not configured" },
      { status: 500 },
    );
  }

  const allowedOrigins = getAllowedOrigins(req);

  const origin = normalizeOrigin(req.headers.get("origin"));
  if (origin && !allowedOrigins.has(origin)) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 },
    );
  }

  const refererOrigin = normalizeOrigin(req.headers.get("referer"));
  if (!origin && refererOrigin && !allowedOrigins.has(refererOrigin)) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 },
    );
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (!origin && !refererOrigin && secFetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 },
    );
  }

  return null;
}