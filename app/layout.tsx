import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans, Spectral } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";
import CookieConsentBanner from "./cookie-consent-banner";
import {
  COOKIE_CONSENT_NAME,
  type CookieConsentValue,
} from "@/lib/cookie-consent";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "latin-ext"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "SignPortal - Enkel e-signering för team",
  description:
    "Skapa avtal, skicka signeringslänkar och följ varje steg i ett snabbt och tydligt e-signeringsflöde.",
  icons: {
    icon: "/favicon-signportal.svg",
    shortcut: "/favicon-signportal.svg",
    apple: "/favicon-signportal.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const consent = cookieStore.get(COOKIE_CONSENT_NAME)?.value;
  const initialConsent: CookieConsentValue | null =
    consent === "accepted" || consent === "rejected" ? consent : null;

  return (
    <html lang="sv">
      <body
        className={`${plusJakartaSans.variable} ${spectral.variable} antialiased`}
      >
        <FirebaseAnalytics />
        {children}
        <CookieConsentBanner initialConsent={initialConsent} />
      </body>
    </html>
  );
}
