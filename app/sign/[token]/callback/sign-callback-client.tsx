"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markAgreementSignedByToken } from "@/lib/agreements";
import { parseIdTicCallback } from "@/lib/idtic";

type SignCallbackClientProps = {
  token: string;
  query: Record<string, string | string[] | undefined>;
};

export default function SignCallbackClient({ token, query }: SignCallbackClientProps) {
  const [message, setMessage] = useState("Verifierar signering...");

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const parsed = parseIdTicCallback(query);

      if (parsed.isFailure) {
        if (active) {
          setMessage("Signeringen avbröts eller misslyckades.");
        }
        return;
      }

      if (!parsed.isSuccess) {
        if (active) {
          setMessage("Callback mottagen, men kunde inte tolka signeringsstatus.");
        }
        return;
      }

      try {
        const updated = await markAgreementSignedByToken({
          token,
          signProvider: parsed.provider,
          signProof: parsed.proof,
        });

        if (!active) {
          return;
        }

        setMessage(updated ? "Signering registrerad." : "Kunde inte hitta avtalet.");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (!active) {
          return;
        }

        setMessage(`Kunde inte uppdatera avtal: ${errorMessage}`);
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [query, token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">BankID callback</h1>
      <p className="text-sm">{message}</p>
      <Link href={`/sign/${token}`} className="w-fit rounded-md border px-4 py-2 text-sm">
        Tillbaka till avtalet
      </Link>
    </main>
  );
}
