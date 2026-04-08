"use client";

import { useEffect, useRef, useState } from "react";
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

function RequiredMark() {
  return (
    <abbr
      title="Obligatoriskt"
      aria-label="Obligatoriskt"
      className="ml-1 cursor-help text-red-600 no-underline"
      tabIndex={0}
    >
      *
    </abbr>
  );
}

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
  const [startingBankId, setStartingBankId] = useState(false);
  const [bankIdVerified, setBankIdVerified] = useState(false);
  const [bankIdIdentityText, setBankIdIdentityText] = useState("");
  const [status, setStatus] = useState("");
  const [website, setWebsite] = useState("");
  const formStartedAtMsRef = useRef(Date.now());

  function setField<K extends keyof OfferPayload>(field: K, value: OfferPayload[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    let active = true;

    async function loadVerificationStatus() {
      try {
        const response = await fetch("/api/offers/verify/status", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          verified?: boolean;
          identity?: {
            fullName?: string;
            personalNumberMasked?: string;
          };
        };

        if (!active) {
          return;
        }

        if (payload.verified) {
          setBankIdVerified(true);

          const identityBits = [
            payload.identity?.fullName?.trim(),
            payload.identity?.personalNumberMasked?.trim(),
          ].filter(Boolean);

          setBankIdIdentityText(identityBits.join(" • "));
        } else {
          setBankIdVerified(false);
          setBankIdIdentityText("");
        }
      } catch {
        if (!active) {
          return;
        }

        setBankIdVerified(false);
        setBankIdIdentityText("");
      }
    }

    const params = new URLSearchParams(window.location.search);
    const bankid = params.get("bankid");

    if (bankid === "success") {
      setStatus("Identifiering med BankID klar. Du kan nu skicka offertförfrågan.");
    } else if (bankid === "failed") {
      setStatus("BankID identifiering avbröts eller misslyckades. Försök igen.");
    } else if (bankid === "pending") {
      setStatus("BankID identifiering väntar fortfarande på svar. Försök igen om det behövs.");
    } else if (bankid === "invalid_state") {
      setStatus("Ogiltigt callback-svar från BankID. Starta identifieringen igen.");
    }

    if (bankid) {
      params.delete("bankid");
      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }

    loadVerificationStatus();

    return () => {
      active = false;
    };
  }, []);

  async function handleStartBankId() {
    setStartingBankId(true);
    setStatus("");

    try {
      const response = await fetch("/api/offers/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirectUrl: window.location.href,
        }),
      });

      const payload = (await response.json()) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.redirectUrl) {
        setStatus(payload.error ?? "Kunde inte starta BankID identifiering.");
        return;
      }

      window.location.assign(payload.redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte starta BankID identifiering: ${message}`);
    } finally {
      setStartingBankId(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.company.trim() || !form.orgNumber.trim() || !form.phone.trim()) {
      setStatus("Fyll i namn, e-post, företag, org.nr och telefon.");
      return;
    }

    if (!bankIdVerified) {
      setStatus("Identifiera dig med BankID innan du skickar offertförfrågan.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const requestPayload = {
        ...form,
        website,
        startedAtMs: formStartedAtMsRef.current,
      };

      const response = await fetch("/api/offers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
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
      setWebsite("");
      formStartedAtMsRef.current = Date.now();
      setBankIdVerified(false);
      setBankIdIdentityText("");
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
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-2 rounded"
        >
          ← Tillbaka till startsidan
        </Link>
      <h1 className="text-2xl font-semibold">Begär offert</h1>
      <p className="text-sm text-muted-foreground">
        Fyll i dina uppgifter så återkommer vi med offert och nästa steg.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="offer-website">Website</label>
          <input
            id="offer-website"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <label className="flex flex-col gap-2" htmlFor="offer-name">
          <span className="text-sm font-medium">Namn<RequiredMark /></span>
          <input
            id="offer-name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="För- och efternamn"
            disabled={loading}
            required
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-email">
          <span className="text-sm font-medium">E-post<RequiredMark /></span>
          <input
            id="offer-email"
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="namn@företag.se"
            disabled={loading}
            required
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-company">
          <span className="text-sm font-medium">Företag<RequiredMark /></span>
          <input
            id="offer-company"
            value={form.company}
            onChange={(event) => setField("company", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="Företagsnamn"
            disabled={loading}
            required
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-orgnumber">
          <span className="text-sm font-medium">Org.nr<RequiredMark /></span>
          <input
            id="offer-orgnumber"
            value={form.orgNumber}
            onChange={(event) => setField("orgNumber", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="556123-4567"
            disabled={loading}
            required
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-phone">
          <span className="text-sm font-medium">Telefon<RequiredMark /></span>
          <input
            id="offer-phone"
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="070-123 45 67"
            disabled={loading}
            required
          />
        </label>

        <label className="flex items-start gap-2 rounded-md border p-3 text-sm" htmlFor="offer-sms-consent">
          <input
            id="offer-sms-consent"
            type="checkbox"
            checked={form.smsConsent}
            onChange={(event) => setField("smsConsent", event.target.checked)}
            disabled={loading}
            className="mt-0.5 focus:ring-2 focus:ring-(--brand)"
          />
          <span>Jag godk{"\u00E4"}nner att ni kontaktar mig via SMS.</span>
        </label>

        <label className="flex flex-col gap-2" htmlFor="offer-package">
          <span className="text-sm font-medium">Paket/produkt (valfritt)</span>
          <input
            id="offer-package"
            value={form.packageName}
            onChange={(event) => setField("packageName", event.target.value)}
            className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
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
            className="min-h-28 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-1"
            placeholder="Beskriv önskemål"
            disabled={loading}
          />
        </label>

        <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium">Steg 1: Identifiera dig med BankID<RequiredMark /></p>
          <p className="mt-1 text-sm text-slate-700">
            Vi skickar inte offertförfrågan vidare förrän din identitet är verifierad.
          </p>
          <button
            type="button"
            onClick={handleStartBankId}
            disabled={loading || startingBankId}
            className="mt-3 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            {startingBankId ? "Startar..." : bankIdVerified ? "Identifiera igen med BankID" : "Identifiera med BankID"}
          </button>

          {bankIdVerified ? (
            <p className="mt-2 text-sm text-green-700">
              Verifierad med BankID{bankIdIdentityText ? `: ${bankIdIdentityText}` : "."}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-700">Ingen aktiv verifiering.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !bankIdVerified}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background focus:outline-none focus:ring-2 focus:ring-(--brand) focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Skickar..." : "Steg 2: Skicka offertförfrågan"}
        </button>
      </form>

      {status ? (
        <p
          className={`text-sm ${status.startsWith("Tack") ? "text-green-700" : status.startsWith("Kunde") ? "text-red-600" : ""}`}
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
      </main>
    </div>
  );
}
