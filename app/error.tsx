"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Något gick fel</h1>
      <p className="text-center text-sm text-slate-600">
        Ett oväntat fel inträffade. Försök igen eller gå tillbaka till startsidan.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]"
        >
          Försök igen
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Till startsidan
        </Link>
      </div>
    </div>
  );
}
