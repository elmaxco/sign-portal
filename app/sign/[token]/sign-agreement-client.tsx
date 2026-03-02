"use client";

import { useEffect, useState } from "react";
import { getAgreementByToken, type Agreement } from "@/lib/agreements";

type SignAgreementClientProps = {
  token: string;
};

export default function SignAgreementClient({ token }: SignAgreementClientProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [status, setStatus] = useState("Laddar avtal...");
  const [startSigningError, setStartSigningError] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const bankid = params.get("bankid");

    if (bankid === "success") {
      setStatus("Signering registrerad.");
      return;
    }

    if (bankid === "failed") {
      setStatus("Signering avbröts eller misslyckades.");
      return;
    }

    if (bankid === "pending") {
      setStatus("Signering pågår fortfarande. Vänta och prova att uppdatera sidan.");
      return;
    }

    if (bankid === "invalid_state") {
      setStatus("Ogiltig callback-state. Starta signeringen igen.");
      return;
    }

    if (bankid === "unknown") {
      setStatus("Callback mottagen men status kunde inte tolkas.");
    }
  }, []);

  async function handleStartSigning() {
    setStartSigningError("");

    try {
      const response = await fetch("/api/tic/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          redirectUrl: window.location.href,
        }),
      });

      const data = (await response.json()) as { redirectUrl?: string; error?: string };

      if (!response.ok || !data.redirectUrl) {
        setStartSigningError(data.error ?? "Kunde inte starta signering.");
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStartSigningError(`Kunde inte starta signering: ${message}`);
    }
  }

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
          {agreement.status !== "signed" ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleStartSigning}
                className="inline-flex rounded-md bg-foreground px-4 py-2 text-background"
              >
                Signera med BankID
              </button>
              {startSigningError ? <p className="mt-2 text-sm">{startSigningError}</p> : null}
            </div>
          ) : null}
        </article>
      ) : null}
    </main>
  );
}
