"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StickyHeader() {
	const pathname = usePathname();

	function handleLogoClick(event: React.MouseEvent<HTMLAnchorElement>) {
		if (pathname === "/") {
			event.preventDefault();
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	return (
		<header className="fixed inset-x-0 top-0 z-50 border-b border-[#d7e0ea] bg-white px-5 py-2 shadow-md sm:px-7">
			<div className="mx-auto w-full max-w-6xl">
				<nav className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
					<Link href="/" onClick={handleLogoClick} className="hover:opacity-90 transition">
						<p className="text-sm font-semibold tracking-[0.18em] text-[var(--brand)]">SIGNPORTAL</p>
						<p className="mt-1 text-xs text-slate-600">Säker e-signering för nordiska team</p>
					</Link>
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<Link
							href="/offer"
							className="rounded-full bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/35 ring-2 ring-white transition hover:bg-cyan-400 hover:shadow-xl hover:shadow-cyan-500/40"
						>
							Begär offert
						</Link>
					</div>
				</nav>
			</div>
		</header>
	);
}
