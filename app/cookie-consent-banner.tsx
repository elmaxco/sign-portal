"use client";

import { useState } from "react";
import {
  readCookieConsent,
  setCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";

const CONSENT_UPDATED_EVENT = "cookie-consent-updated";

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(() => readCookieConsent() === null);

  const handleChoice = (value: CookieConsentValue) => {
    setCookieConsent(value);
    setIsVisible(false);
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie-samtycke">
      <div className="cookie-banner__content">
        <p className="cookie-banner__title">Vi använder cookies</p>
        <p className="cookie-banner__text">
          Vi använder nödvändiga cookies för att sidan ska fungera och valfria analyscookies för att förbättra
          upplevelsen.
        </p>
      </div>
      <div className="cookie-banner__actions">
        <button
          type="button"
          className="cookie-button cookie-button--secondary"
          onClick={() => handleChoice("rejected")}
        >
          Endast nödvändiga
        </button>
        <button
          type="button"
          className="cookie-button cookie-button--primary"
          onClick={() => handleChoice("accepted")}
        >
          Godkänn alla
        </button>
      </div>
    </aside>
  );
}
