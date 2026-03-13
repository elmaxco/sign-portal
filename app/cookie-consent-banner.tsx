"use client";

import { useState } from "react";
import {
  setCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";

const CONSENT_UPDATED_EVENT = "cookie-consent-updated";

type CookieConsentBannerProps = {
  initialConsent: CookieConsentValue | null;
};

export default function CookieConsentBanner({ initialConsent }: CookieConsentBannerProps) {
  const [consentValue, setConsentValue] = useState<CookieConsentValue | null>(initialConsent);
  const [isVisible, setIsVisible] = useState(() => consentValue === null);

  const handleChoice = (value: CookieConsentValue) => {
    setCookieConsent(value);
    setConsentValue(value);
    setIsVisible(false);
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  };

  return (
    <>
      {!isVisible && consentValue !== null ? (
        <button
          type="button"
          className="cookie-fab"
          aria-label="Öppna cookie-inställningar"
          onClick={() => setIsVisible(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="cookie-fab__icon">
            <path
              d="M12 2a10 10 0 1 0 10 10c-2.8 0-5-2.2-5-5 0-1.1.4-2.1 1-2.9A10 10 0 0 0 12 2Zm-2.7 6.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm5.1 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-4.6 5.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm5.7 1.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
              fill="currentColor"
            />
          </svg>
        </button>
      ) : null}

      {isVisible ? (
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
      ) : null}
    </>
  );
}
