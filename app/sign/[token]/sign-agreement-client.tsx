"use client";

import { useEffect, useState } from "react";
import { getAgreementByToken, type Agreement } from "@/lib/agreements";

type SignAgreementClientProps = {
  token: string;
};

export default function SignAgreementClient({ token }: SignAgreementClientProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [status, setStatus] = useState("Laddar avtal...");

  useEffect(() => {
    let active = true;

    async function loadAgreement() {
      try {
        const result = await getAgreementByToken(token);

        if (!active) {
          return;
        }

        if (!result) {
          setAgreement(null);
          setStatus("Avtal hittades inte.");
          return;
        }

        setAgreement(result);
        setStatus("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (!active) {
          return;
        }

        setAgreement(null);
        setStatus(`Kunde inte läsa avtal: ${message}`);
      }
    }

    loadAgreement();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Signering</h1>

      {status ? <p className="text-sm">{status}</p> : null}

      {agreement ? (
        <article className="rounded-md border p-4">
          <h2 className="text-xl font-semibold">{agreement.title}</h2>
          <p className="mt-3 whitespace-pre-wrap">{agreement.content}</p>
          <p className="mt-4 text-sm">
            Status: {agreement.status === "signed" ? "Signerad" : "Ej signerad"}
          </p>
        </article>
      ) : null}
    </main>
  );
}
