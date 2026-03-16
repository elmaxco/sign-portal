export const COOKIE_CONSENT_NAME = "signportal_cookie_consent";

export type CookieConsentValue = "accepted" | "rejected";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE_CONSENT_NAME}=`));

  if (!match) {
    return null;
  }

  const value = match.split("=")[1];
  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return null;
}

export function setCookieConsent(value: CookieConsentValue) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${COOKIE_CONSENT_NAME}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
