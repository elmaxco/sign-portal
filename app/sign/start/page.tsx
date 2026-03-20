"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignStartPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function parseModeAndToken(value: string) {
    const match = value.match(/^\/?(sign|signup)\/([\w-]+)\/?$/);
    if (!match) {
      return null;
    }

    return {
      mode: match[1],
      token: match[2],
    };
  }

  function resolveSignPath(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    try {
      const url = new URL(trimmedValue);
      const parsedFromUrlPath = parseModeAndToken(url.pathname);

      if (parsedFromUrlPath) {
        return `/${parsedFromUrlPath.mode}/${parsedFromUrlPath.token}`;
      }
    } catch {
      // Ignore non-URL values and continue with path/token parsing.
    }

    const parsedFromPath = parseModeAndToken(trimmedValue);
    if (parsedFromPath) {
      return `/${parsedFromPath.mode}/${parsedFromPath.token}`;
    }

    if (/^[\w-]{20,}$/.test(trimmedValue)) {
      return `/sign/${trimmedValue}`;
    }

    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const signPath = resolveSignPath(input.trim());
    if (signPath) {
      router.push(signPath);
    } else {
      setError("Ogiltig länk eller kod. Kontrollera och försök igen.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16 items-center text-center">
      <h1 className="text-3xl font-bold">Signera avtal</h1>
      <p className="text-lg text-slate-700 max-w-xl">
        Har du fått en signeringslänk? Klistra in den här eller klicka på länken du fått via e-post eller SMS.
      </p>
      <form className="flex flex-col gap-4 w-full max-w-md mx-auto items-center" onSubmit={handleSubmit}>
        <input
          type="text"
          className="w-full rounded border px-3 py-2 text-base"
          placeholder="Klistra in signerings- eller signup-länk, eller kod"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-cyan-600 px-5 py-2 text-white font-semibold hover:bg-cyan-700"
        >
          Gå till signering
        </button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
        <Link href="/" className="text-cyan-700 underline">Tillbaka till startsidan</Link>
      </div>
    </main>
  );
}
