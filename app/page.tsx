import Link from "next/link";

export default function Home() {
  const trustBadges = ["BankID-klar identitet", "Server-side kontroll", "E-sign med tydligt audit-spår"];

  const customerLogos = ["Atea", "Securitas", "WSP", "Bonnier", "Vasakronan", "Sweco"];

  const steps = [
    {
      title: "Skapa avtal på minuter",
      text: "Bygg avtal med text, bilagor och länkat innehåll - klart för signering direkt.",
    },
    {
      title: "Skicka unik signup-länk",
      text: "Mottagaren får en personlig länk och identifierar sig tryggt med BankID.",
    },
    {
      title: "Följ hela flödet live",
      text: "Se status, påminnelser och signerat resultat i admin utan manuellt jagande.",
    },
  ];

  const features = [
    "Offertformulär för nya kunder",
    "Automatiska mejl och SMS-påminnelser",
    "Bilagor med privat lagring och signerad nedladdning",
    "Rate limits, admin-skydd och cron-kontroll",
  ];

  return (
    <div className="min-h-screen pb-8">
      <main className="mx-auto w-full max-w-6xl">
        <header className="glass-card fade-in-up mt-6 rounded-2xl px-5 py-4 sm:px-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-[var(--brand)]">SIGNPORTAL</p>
              <p className="mt-1 text-xs text-slate-600">Säker e-signering för nordiska team</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/offer" className="rounded-full border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-soft)]">
                Begär offert
              </Link>
              <Link href="/admin" className="rounded-full bg-[var(--brand)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-strong)]">
                Öppna admin
              </Link>
            </div>
          </nav>
        </header>

        <section className="mt-4 overflow-hidden rounded-3xl bg-[#111827] text-white">
          <div className="grid gap-6 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr]">
            <article>
              <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">E-SIGNERING OCH EID</p>
              <h1 className="text-balance mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Anpassad för Europa och byggd för svenska avtal.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                Snabb signering, högre konvertering och tydlig verifiering med BankID. En plattform för team som vill
                ha samma känsla som enterprise-verktyg men med snabb implementation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/offer" className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
                  Starta gratisdemo
                </Link>
                <Link href="/admin" className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold hover:bg-white/10">
                  Se adminflöde
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200 sm:text-sm">
                {trustBadges.map((badge) => (
                  <li key={badge} className="rounded-full border border-white/25 px-3 py-1">
                    {badge}
                  </li>
                ))}
              </ul>
            </article>

            <aside className="rounded-3xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-200">TESTA SIGNPORTAL</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">Gratis i 14 dagar</h2>
              <p className="mt-2 text-sm text-slate-200">Ingen bindningstid. Sätt upp ett avtal och skicka första länken på under 10 minuter.</p>

              <div className="mt-5 space-y-3 text-sm">
                <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 placeholder:text-slate-300/80" placeholder="Företagsnamn" />
                <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 placeholder:text-slate-300/80" placeholder="E-post" />
                <input className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 placeholder:text-slate-300/80" placeholder="Telefon" />
                <button className="w-full rounded-xl bg-cyan-400 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                  Skapa testkonto
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-[#edf1f4] px-5 py-5 sm:px-7">
          <p className="text-center text-sm font-semibold text-slate-700">Fler än 1 200 kunder litar på vår signering</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm font-semibold text-slate-500 sm:grid-cols-3 lg:grid-cols-6">
            {customerLogos.map((logo) => (
              <div key={logo} className="rounded-xl bg-white px-3 py-2">
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 px-4 sm:px-0">
          <h2 className="text-center text-3xl font-semibold leading-tight text-slate-900">Lösningar för digital signatur och eID</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-slate-600">
            Samma trygga grund, olika paketering för hur team arbetar med avtal, onboarding och återkommande processer.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="h-24 bg-[linear-gradient(130deg,#e2e8f0,#cbd5e1_55%,#f8fafc)]" />
                <div className="p-4">
                  <p className="text-xs font-semibold tracking-[0.15em] text-slate-500">LÖSNING {index + 1}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-white px-6 py-8 sm:px-10">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Tillit och säkerhet i varje steg</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            Infrastruktur och processer byggda för företag med höga krav på spårbarhet, identitet och dataskydd.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🔐</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Verifierad identitet</p>
              <p className="mt-1 text-xs text-slate-600">BankID-inloggning och säkrad länkhantering</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🛡️</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">ISO-riktad struktur</p>
              <p className="mt-1 text-xs text-slate-600">Audit-spår, serverlogik och kontrollerad access</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">⚖️</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">eIDAS-kompatibel process</p>
              <p className="mt-1 text-xs text-slate-600">Tydlig signeringskedja för juridisk trygghet</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🇪🇺</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">EU-fokuserad datahantering</p>
              <p className="mt-1 text-xs text-slate-600">Privat lagring och kontrollerad nedladdning</p>
            </article>
          </div>
        </section>

        <section className="mt-10 px-4 sm:px-0">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Effektivisera kundflöden i din bransch</h2>
          <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <article
                key={feature}
                className={`rounded-2xl p-4 text-sm font-semibold ${
                  index % 2 === 0 ? "bg-[#f6dd74] text-slate-900" : "bg-[#e6edf4] text-slate-800"
                }`}
              >
                {feature}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-[#e9eff5] px-6 py-9 sm:px-10">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Så ser digital transformation ut i praktiken</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl bg-white p-5 text-center">
              <p className="text-3xl font-semibold text-[var(--brand)]">50%</p>
              <p className="mt-2 text-sm font-semibold">mindre administrationstid</p>
              <p className="mt-1 text-xs text-slate-500">vid digital hantering av avtal</p>
            </article>
            <article className="rounded-2xl bg-white p-5 text-center">
              <p className="text-3xl font-semibold text-[var(--brand)]">120%</p>
              <p className="mt-2 text-sm font-semibold">högre konverteringsgrad</p>
              <p className="mt-1 text-xs text-slate-500">med snabbare signeringsflöde</p>
            </article>
            <article className="rounded-2xl bg-white p-5 text-center">
              <p className="text-3xl font-semibold text-[var(--brand)]">80%</p>
              <p className="mt-2 text-sm font-semibold">kortare handläggningstid</p>
              <p className="mt-1 text-xs text-slate-500">från första kontakt till avtal</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
