const FALLBACK_ORIGIN = "https://www.clarify.kz";

/** Canonical origin of the site (APP_ORIGIN, falling back to production). */
export function getSiteOrigin() {
  const raw = process.env.APP_ORIGIN?.trim();
  if (!raw) return FALLBACK_ORIGIN;

  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

/** Serializes structured data for a <script type="application/ld+json"> tag. */
export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
