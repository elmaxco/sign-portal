"use client";

import { useState } from "react";
import Link from "next/link";
import StickyHeader from "../sticky-header";

type OfferPayload = {
  name: string;
  email: string;
  company: string;
  orgNumber: string;
  phone: string;
  smsConsent: boolean;
  packageName: string;
  notes: string;
};

const INITIAL_FORM: OfferPayload = {
  name: "",
  email: "",
  company: "",
  orgNumber: "",
  phone: "",
  smsConsent: false,
  packageName: "",
  notes: "",
};

export default function OfferPage() {
  const [form, setForm] = useState<OfferPayload>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  function setField<K extends keyof OfferPayload>(field: K, value: OfferPayload[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.company.trim() || !form.orgNumber.trim() || !form.phone.trim()) {
      setStatus("Fyll i namn, e-post, företag, org.nr och telefon.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/offers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        confirmationEmailSent?: boolean;
      };

      if (!response.ok || !payload.ok) {
        setStatus(payload.error ?? "Kunde inte skicka offertförfrågan.");
        return;
      }

      setForm(INITIAL_FORM);
      setStatus(
        payload.confirmationEmailSent === false
          ? "Tack! Din offertförfrågan är inskickad, men bekräftelsemejlet kunde inte skickas just nu."
          : "Tack! Din offertförfrågan är inskickad.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skicka offertförfrågan: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <StickyHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-28 pb-12 sm:pt-32">
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          ← Tillbaka till startsidan
        </Link>
      <h1 className="text-2xl font-semibold">Begär offert</h1>
      <p className="text-sm text-muted-foreground">
        Fyll i dina uppgifter så återkommer vi med offert och nästa steg.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2" htmlFor="offer-name">
          <span className="text-sm font-medium">Namn</span>
          <input
            id="offer-name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="För- och efternamn"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-email">
          <span className="text-sm font-medium">E-post</span>
          <input
            id="offer-email"
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="namn@företag.se"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-company">
          <span className="text-sm font-medium">Företag</span>
          <input
            id="offer-company"
            value={form.company}
            onChange={(event) => setField("company", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="Företagsnamn"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-orgnumber">
          <span className="text-sm font-medium">Org.nr</span>
          <input
            id="offer-orgnumber"
            value={form.orgNumber}
            onChange={(event) => setField("orgNumber", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="556123-4567"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-phone">
          <span className="text-sm font-medium">Telefon</span>
          <input
            id="offer-phone"
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="070-123 45 67"
            disabled={loading}
          />
        </label>

        <label className="flex items-start gap-2 rounded-md border p-3 text-sm" htmlFor="offer-sms-consent">
          <input
            id="offer-sms-consent"
            type="checkbox"
            checked={form.smsConsent}
            onChange={(event) => setField("smsConsent", event.target.checked)}
            disabled={loading}
            className="mt-0.5 focus:ring-2 focus:ring-[var(--brand)]"
          />
          <span>Jag godk{"\u00E4"}nner att ni kontaktar mig via SMS.</span>
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-package">
          <span className="text-sm font-medium">Paket/produkt (valfritt)</span>
          <input
            id="offer-package"
            value={form.packageName}
            onChange={(event) => setField("packageName", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="Ex. Standardpaket"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-notes">
          <span className="text-sm font-medium">Kommentar (valfritt)</span>
          <textarea
            id="offer-notes"
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="min-h-28 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
            placeholder="Beskriv önskemål"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Skickar..." : "Skicka offertförfrågan"}
        </button>
      </form>

      {status ? <p className="text-sm" role="status" aria-live="polite">{status}</p> : null}
      </main>
    </div>
  );
}
