"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OfferItem = {
  id: string;
  name: string;
  email: string;
  company: string;
  orgNumber: string;
  phone: string;
  smsConsent: boolean;
  packageName: string;
  notes: string;
  status: "new" | "converted";
  createdAt: string;
  convertedToAgreementAt: string | null;
  agreementId: string | null;
  agreementToken: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [status, setStatus] = useState("Laddar offerter...");
  const [creatingForOfferId, setCreatingForOfferId] = useState<string | null>(null);
  const [deletingForOfferId, setDeletingForOfferId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOffers() {
      try {
        const response = await fetch("/api/admin/offers/list", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as { offers?: OfferItem[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kunde inte läsa offerter.");
        }

        if (!active) {
          return;
        }

        const items = payload.offers ?? [];
        setOffers(items);
        setStatus(items.length ? "" : "Inga offerter ännu.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (!active) {
          return;
        }

        setStatus(`Kunde inte läsa offerter: ${message}`);
      }
    }

    loadOffers();

    return () => {
      active = false;
    };
  }, []);

  async function createAgreementFromOffer(offerId: string) {
    setCreatingForOfferId(offerId);

    try {
      const response = await fetch("/api/admin/offers/create-agreement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ offerId }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        agreement?: { id: string; token: string };
        signLinkEmailSent?: boolean;
        signLinkEmailError?: string;
        signLinkSmsSent?: boolean;
        signLinkSmsError?: string;
        signLinkSmsSkippedReason?: string;
      };

      if (!response.ok || !payload.ok || !payload.agreement) {
        setStatus(payload.error ?? "Kunde inte skapa avtal från offert.");
        return;
      }

      setOffers((previous) =>
        previous.map((offer) =>
          offer.id === offerId
            ? {
                ...offer,
                status: "converted",
                convertedToAgreementAt: new Date().toISOString(),
                agreementId: payload.agreement?.id ?? null,
                agreementToken: payload.agreement?.token ?? null,
              }
            : offer,
        ),
      );

      const emailPart = payload.signLinkEmailSent
        ? "signlank via e-post skickades"
        : payload.signLinkEmailError
          ? `signlank via e-post misslyckades: ${payload.signLinkEmailError}`
          : "e-poststatus okand";
      const smsPart = payload.signLinkSmsSent
        ? "SMS skickades"
        : payload.signLinkSmsError
          ? `SMS misslyckades: ${payload.signLinkSmsError}`
          : payload.signLinkSmsSkippedReason
            ? `SMS hoppades over: ${payload.signLinkSmsSkippedReason}`
            : "";

      setStatus(`Avtal skapades fran offert, ${emailPart}.${smsPart ? ` ${smsPart}` : ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skapa avtal från offert: ${message}`);
    } finally {
      setCreatingForOfferId(null);
    }
  }

  async function deleteOffer(offer: OfferItem) {
    const confirmed = window.confirm(
      `Ta bort offerten från ${offer.company || offer.name}? Detta kan inte ångras.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingForOfferId(offer.id);

    try {
      const response = await fetch("/api/admin/offers/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ offerId: offer.id }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setStatus(payload.error ?? "Kunde inte ta bort offert.");
        return;
      }

      setOffers((previous) => previous.filter((item) => item.id !== offer.id));
      setStatus("Offerten togs bort.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte ta bort offert: ${message}`);
    } finally {
      setDeletingForOfferId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin - Offerter</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/offer" className="rounded-md border px-4 py-2 text-sm">
            Oppna offertformular
          </Link>
          <Link href="/admin" prefetch={false} className="rounded-md border px-4 py-2 text-sm">
            Tillbaka till avtal
          </Link>
        </div>
      </header>

      {status ? <p className="text-sm">{status}</p> : null}

      <ul className="space-y-3">
        {offers.map((offer) => (
          <li key={offer.id} className="rounded-md border p-4">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium">Namn:</span> {offer.name}
              </p>
              <p>
                <span className="font-medium">E-post:</span> {offer.email}
              </p>
              <p>
                <span className="font-medium">Företag:</span> {offer.company}
              </p>
              <p>
                <span className="font-medium">Org.nr:</span> {offer.orgNumber}
              </p>
              <p>
                <span className="font-medium">Telefon:</span> {offer.phone}
              </p>
              <p>
                <span className="font-medium">SMS-samtycke:</span> {offer.smsConsent ? "Ja" : "Nej"}
              </p>
              <p>
                <span className="font-medium">Paket:</span> {offer.packageName || "-"}
              </p>
              <p>
                <span className="font-medium">Skapad:</span> {formatDateTime(offer.createdAt)}
              </p>
              <p>
                <span className="font-medium">Konverterad:</span> {formatDateTime(offer.convertedToAgreementAt)}
              </p>
              <p>
                <span className="font-medium">Status:</span> {offer.status}
              </p>
              <p>
                <span className="font-medium">Kommentar:</span> {offer.notes || "-"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                disabled={creatingForOfferId === offer.id || offer.status === "converted"}
                onClick={() => createAgreementFromOffer(offer.id)}
              >
                {creatingForOfferId === offer.id ? "Skapar..." : "Skapa avtal från offert"}
              </button>

              <button
                type="button"
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50"
                disabled={deletingForOfferId === offer.id}
                onClick={() => deleteOffer(offer)}
              >
                {deletingForOfferId === offer.id ? "Tar bort..." : "Ta bort offert"}
              </button>

              {offer.agreementToken ? (
                <Link href={`/sign/${offer.agreementToken}`} className="text-sm underline">
                  Öppna skapat avtal
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
