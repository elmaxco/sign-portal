"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminAgreement = {
  id: string;
  title: string;
  token: string;
  recipientEmail: string | null;
  status: "draft" | "signing" | "signed";
  sentAt: string | null;
};

export default function AdminAgreementsPage() {
  const [agreements, setAgreements] = useState<AdminAgreement[]>([]);
  const [status, setStatus] = useState("Laddar avtal...");
  const [sendingToken, setSendingToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAgreements() {
      try {
        const response = await fetch("/api/admin/agreements/list", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          agreements?: AdminAgreement[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kunde inte läsa avtal.");
        }

        const result = payload.agreements ?? [];

        if (!active) {
          return;
        }

        setAgreements(result);
        setStatus(result.length ? "" : "Inga avtal ännu.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (!active) {
          return;
        }

        setStatus(`Kunde inte läsa avtal: ${message}`);
      }
    }

    loadAgreements();

    return () => {
      active = false;
    };
  }, []);

  async function copyLink(token: string) {
    try {
      const baseUrl = window.location.origin;
      await navigator.clipboard.writeText(`${baseUrl}/sign/${token}`);
      setStatus("Länk kopierad.");
    } catch {
      setStatus("Kunde inte kopiera länken.");
    }
  }

  async function sendAgreementLink(token: string) {
    setSendingToken(token);

    try {
      const response = await fetch("/api/admin/agreements/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setStatus(payload.error ?? "Kunde inte skicka signlänken.");
        return;
      }

      const nowIso = new Date().toISOString();

      setAgreements((previous) =>
        previous.map((agreement) =>
          agreement.token === token ? { ...agreement, sentAt: nowIso } : agreement,
        ),
      );
      setStatus("Signlänk skickad.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skicka signlänk: ${message}`);
    } finally {
      setSendingToken(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link href="/admin/new" className="rounded-md border px-4 py-2 text-sm">
          Nytt avtal
        </Link>
      </header>

      {status ? <p className="text-sm">{status}</p> : null}

      <ul className="space-y-3">
        {agreements.map((agreement) => {
          const signPath = `/sign/${agreement.token}`;

          return (
            <li key={agreement.id} className="rounded-md border p-4">
              <p className="font-medium">{agreement.title || "(utan titel)"}</p>
              <p className="text-sm">Status: {agreement.status}</p>
              <p className="text-sm">Mottagare: {agreement.recipientEmail || "saknas"}</p>
              <p className="text-sm">
                Senast skickat: {agreement.sentAt ? new Date(agreement.sentAt).toLocaleString() : "aldrig"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={signPath} className="text-sm underline">
                  Öppna avtal
                </Link>
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => copyLink(agreement.token)}
                >
                  Kopiera länk
                </button>
                <button
                  type="button"
                  className="text-sm underline disabled:opacity-50"
                  disabled={sendingToken === agreement.token || !agreement.recipientEmail}
                  onClick={() => sendAgreementLink(agreement.token)}
                >
                  {sendingToken === agreement.token
                    ? "Skickar..."
                    : agreement.sentAt
                      ? "Skicka igen"
                      : "Skicka signlänk"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
