"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase";
import { readCookieConsent } from "@/lib/cookie-consent";

const CONSENT_UPDATED_EVENT = "cookie-consent-updated";

export default function FirebaseAnalytics() {
  useEffect(() => {
    const initIfAccepted = () => {
      if (readCookieConsent() === "accepted") {
        initAnalytics();
      }
    };

    initIfAccepted();
    window.addEventListener(CONSENT_UPDATED_EVENT, initIfAccepted);

    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, initIfAccepted);
    };
  }, []);

  return null;
}
