"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyHeader() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setIsScrolled(window.scrollY > 14);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", onScroll);
		};
	}, []);

	return (
		<header
			className={`fixed inset-x-0 top-0 z-50 px-5 sm:px-7 transition-all duration-300 ${
				isScrolled
					? "border-b border-[#d7e0ea] bg-white/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85"
					: "bg-transparent py-3"
			}`}
		>
			<div className="mx-auto w-full max-w-6xl">
				<nav
					className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-all duration-300 sm:px-7 ${
						isScrolled ? "rounded-none" : "glass-card rounded-2xl"
					}`}
				>
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
