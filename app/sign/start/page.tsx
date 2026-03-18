"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignStartPage() {
  const [input, setInput] = useState("");
  const router = useRouter();

  function extractToken(value: string) {    
    const match = value.match(/\/sign\/([\w-]+)/);
    if (match) return match[1];   
    if (/^[\w-]{20,}$/.test(value)) return value;
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(input.trim());
    if (token) {
      router.push(`/sign/${token}`);
    } else {
      alert("Ogiltig länk eller kod. Kontrollera och försök igen.");
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
          placeholder="Klistra in signeringslänk eller kod"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-cyan-600 px-5 py-2 text-white font-semibold hover:bg-cyan-700"
        >
          Gå till signering
        </button>
      </form>
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
        <Link href="/" className="text-cyan-700 underline">Tillbaka till startsidan</Link>
      </div>
    </main>
  );
}
