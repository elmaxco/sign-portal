"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminAgreement = {
  id: string;
  title: string;
  token: string;
  status: "draft" | "signing" | "signed";
};

export default function AdminAgreementsPage() {
  const [agreements, setAgreements] = useState<AdminAgreement[]>([]);
  const [status, setStatus] = useState("Laddar avtal...");

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
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
