"use client";

import Link from "next/link";

export default function StickyHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-50 border-b border-[#d7e0ea] bg-white/95 px-5 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-7">
			<div className="mx-auto w-full max-w-6xl">
				<nav className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
					<div>
						<p className="text-sm font-semibold tracking-[0.18em] text-[var(--brand)]">SIGNPORTAL</p>
						<p className="mt-1 text-xs text-slate-600">Säker e-signering för nordiska team</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<Link
							href="/offer"
							className="rounded-full border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-soft)]"
						>
							  Begär offert
						</Link>
						<Link
							href="/admin"
							prefetch={false}
							className="rounded-full bg-[var(--brand)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-strong)]"
						>
							  Öppna admin
						</Link>
					</div>
				</nav>
			</div>
		</header>
	);
}
