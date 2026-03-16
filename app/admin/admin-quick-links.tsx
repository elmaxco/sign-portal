import Link from "next/link";

export default function AdminQuickLinks() {
  return (
    <section className="rounded-xl border bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Snabblänkar</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin" prefetch={false} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Avtal
        </Link>
        <Link href="/admin/new" prefetch={false} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Nytt avtal
        </Link>
        <Link href="/admin/offers" prefetch={false} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Offerter
        </Link>
        <Link href="/" className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--brand-strong)]">
          Till startsidan
        </Link>
      </div>
    </section>
  );
}
