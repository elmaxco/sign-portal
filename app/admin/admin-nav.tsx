"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

type AdminNavProps = {
  title: string;
};

function navClass(active: boolean) {
  return active
    ? "rounded-md border border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_10%,white)] px-3 py-2 text-sm font-medium text-[var(--brand)]"
    : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100";
}

export default function AdminNav({ title }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-3 z-30 rounded-xl border bg-white/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Tillbaka
            </button>
            <Link
              href="/"
              className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--brand-strong)]"
            >
              Till startsidan
            </Link>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link href="/admin" prefetch={false} className={navClass(pathname === "/admin")}>
            Avtal
          </Link>
          <Link href="/admin/new" prefetch={false} className={navClass(pathname === "/admin/new")}>
            Nytt avtal
          </Link>
          <Link href="/admin/offers" prefetch={false} className={navClass(pathname === "/admin/offers")}>
            Offerter
          </Link>
        </nav>
      </div>
    </header>
  );
}
