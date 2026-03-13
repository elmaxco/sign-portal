import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Spectral } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignPortal - Enkel e-signering for team",
  description:
    "Skapa avtal, skicka signeringslankar och folj varje steg i ett snabbt och tydligt e-signeringsflode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${spectral.variable} antialiased`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
