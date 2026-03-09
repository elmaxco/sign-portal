"use client";

import { useState } from "react";

type OfferPayload = {
  name: string;
  email: string;
  company: string;
  orgNumber: string;
  phone: string;
  packageName: string;
  notes: string;
};

const INITIAL_FORM: OfferPayload = {
  name: "",
  email: "",
  company: "",
  orgNumber: "",
  phone: "",
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

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setStatus(payload.error ?? "Kunde inte skicka offertförfrågan.");
        return;
      }

      setForm(INITIAL_FORM);
      setStatus("Tack! Din offertförfrågan är inskickad.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skicka offertförfrågan: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Begär offert</h1>
      <p className="text-sm text-muted-foreground">
        Fyll i dina uppgifter så återkommer vi med offert och nästa steg.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Namn</span>
          <input
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="För- och efternamn"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">E-post</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="namn@foretag.se"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Företag</span>
          <input
            value={form.company}
            onChange={(event) => setField("company", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="Företagsnamn"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Org.nr</span>
          <input
            value={form.orgNumber}
            onChange={(event) => setField("orgNumber", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="556123-4567"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Telefon</span>
          <input
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="070-123 45 67"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Paket/produkt (valfritt)</span>
          <input
            value={form.packageName}
            onChange={(event) => setField("packageName", event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="Ex. Standardpaket"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Kommentar (valfritt)</span>
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="min-h-28 rounded-md border px-3 py-2"
            placeholder="Beskriv önskemål"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading ? "Skickar..." : "Skicka offertförfrågan"}
        </button>
      </form>

      {status ? <p className="text-sm">{status}</p> : null}
    </main>
  );
}
