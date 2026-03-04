"use client";

import Link from "next/link";
import { parseIdTicCallback } from "@/lib/idtic";

type SignCallbackClientProps = {
  token: string;
  query: Record<string, string | string[] | undefined>;
};

export default function SignCallbackClient({ token, query }: SignCallbackClientProps) {
  const parsed = parseIdTicCallback(query);

  const message = parsed.isFailure
    ? "Signeringen avbröts eller misslyckades."
    : parsed.isSuccess
      ? "Callback mottagen. Verifierar status..."
      : "Callback mottagen, men kunde inte tolka signeringsstatus.";

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
