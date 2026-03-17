import Link from "next/link";

export default function SignStartPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16 items-center text-center">
      <h1 className="text-3xl font-bold">Signera avtal</h1>
      <p className="text-lg text-slate-700 max-w-xl">
        Har du fått en signeringslänk? Klistra in den här eller klicka på länken du fått via e-post eller SMS.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
        <Link href="/" className="text-cyan-700 underline">Tillbaka till startsidan</Link>
      </div>
    </main>
  );
}
