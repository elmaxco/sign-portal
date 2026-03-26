import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-16 items-center text-center">
      <h1 className="text-4xl font-bold">Sidan finns inte</h1>
      <p className="text-lg text-slate-700 max-w-xl">
        Tyvärr, vi kunde inte hitta sidan du letade efter.<br />
        Kontrollera adressen eller gå tillbaka till{" "}
        <Link href="/" className="text-cyan-700 underline">
          startsidan
        </Link>
        .
      </p>
    </main>
  );
}
