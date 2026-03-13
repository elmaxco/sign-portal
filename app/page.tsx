import Link from "next/link";

export default function Home() {
  const trustBadges = [
    "BankID-klar identitet",
    "Server-side kontroll",
    "E-sign med tydligt audit-spår",
  ];

  const steps = [
    {
      title: "Skapa avtal pa minuter",
      text: "Bygg avtal med text, bilagor och lankat innehall - klart for signering direkt.",
    },
    {
      title: "Skicka unik signup-lank",
      text: "Mottagaren far en personlig lank och identifierar sig tryggt med BankID.",
    },
    {
      title: "Folj hela flodet live",
      text: "Se status, paminnelser och signerat resultat i admin utan manuellt jagande.",
    },
  ];

  const features = [
    "Offertformular for nya kunder",
    "Automatiska mail och SMS-paminnelser",
    "Bilagor med privat lagring och signerad nedladdning",
    "Rate limits, admin-skydd och cron-kontroll",
  ];

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <main className="mx-auto w-full max-w-6xl">
        <header className="glass-card fade-in-up rounded-2xl px-5 py-4 sm:px-7">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-[var(--brand)]">SIGNPORTAL</p>
              <p className="mt-1 text-xs text-slate-600">Saker e-signering for nordiska team</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/offer" className="rounded-full border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-soft)]">
                Begar offert
              </Link>
              <Link href="/admin" className="rounded-full bg-[var(--brand)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-strong)]">
                Oppna admin
              </Link>
            </div>
          </nav>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
          <article className="glass-card fade-in-up rounded-3xl p-7 sm:p-10">
            <p className="inline-flex rounded-full bg-[color-mix(in_oklab,var(--brand)_14%,white)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
              PUBLIC PRODUCT FRONT
            </p>
            <h1 className="text-balance mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Signera avtal snabbare med samma trygghet som storbolag kraver.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Skapa avtal, skicka unika signup-lankar, samla BankID-signering och folj varje steg i ett tydligt flode.
              Allt byggt for att kunna koras pa Vercel eller din egen Linux-server.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/offer" className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
                Starta med offert
              </Link>
              <Link href="/signup/demo-token" className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-soft)]">
                Testa signup-flode
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-2 text-xs text-slate-600 sm:text-sm">
              {trustBadges.map((badge) => (
                <li key={badge} className="rounded-full border border-[var(--border)] bg-white px-3 py-1">
                  {badge}
                </li>
              ))}
            </ul>
          </article>

          <aside className="glass-card fade-in-up rounded-3xl p-7 [animation-delay:120ms] sm:p-8">
            <p className="text-sm font-semibold text-[var(--brand)]">Varfor team valjer oss</p>
            <ul className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">STEG {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <article className="glass-card rounded-3xl p-7 sm:p-8">
            <h2 className="font-serif text-3xl leading-tight text-slate-900">Byggt for hela avtalsresan</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Fron forsta offertforfragan till signerat avtal och uppfoljning - utan att hoppa mellan fem olika verktyg.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="glass-card rounded-3xl p-7 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">KUNDRESA</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
                1. Kunden fyller formularet pa <span className="font-semibold">/offer</span>.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
                2. Admin skapar avtal och skickar unik lank pa <span className="font-semibold">/signup/[token]</span>.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
                3. Mottagaren identifierar sig med BankID och signerar.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
                4. Teamet far notis, historik och full status i admin.
              </div>
            </div>
          </article>
        </section>

        <section className="glass-card mt-8 rounded-3xl px-7 py-9 text-center sm:px-10 sm:py-12">
          <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">
            Redo att ga fran intern verktygskansla till riktig publik produktfront?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
            Vi har nu byggt floden, sakrat API:erna och forberett onboarding. Nu tar vi nasta steg med design,
            konvertering och tydlig kundupplevelse.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/offer" className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
              Begar offert
            </Link>
            <Link href="/admin" className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-soft)]">
              Logga in i admin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
