import Image from "next/image";
import Link from "next/link";
import CompanyCarousel from "./company-carousel";

export default function Home() {
  const trustBadges = ["BankID-klar identitet", "Server-side kontroll", "E-sign med tydligt audit-spår"];

  const customerLogos = [
    { name: "Avanza", logo: "/company-logos/Avanza_Dark.svg" },
    { name: "Volvo", logo: "/company-logos/VOLVO_HORIZ_Orig.svg" },
    { name: "Peab", logo: "/company-logos/PEAB_Dark.svg" },
    { name: "Nordnet", logo: "/company-logos/Nordnet_Dark.svg" },
    { name: "Randstad", logo: "/company-logos/Randstad_Dark.svg" },
    { name: "Lovable", logo: "/company-logos/Logo_Lovable_Dark.svg" },
  ];

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

  const solutionImages = [
    "/solutions/solution-1.svg",
    "/solutions/solution-2.svg",
    "/solutions/solution-3.svg",
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
        <header className="glass-card fade-in-up sticky top-3 z-40 mt-6 rounded-2xl px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:px-7">
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
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-200">NÄSTA STEG</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">Kom igång med rätt upplägg</h2>
              <p className="mt-2 text-sm text-slate-200">
                Vi erbjuder offert, genomgång av flöden och onboarding för team. Välj det som passar er bäst.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>• Begär prisförslag utifrån volym och användare</li>
                <li>• Få demo av signering, signup-länkar och adminflöde</li>
                <li>• Sätt upp första avtalsflödet tillsammans med oss</li>
              </ul>

              <div className="mt-5 grid gap-2 text-sm">
                <Link
                  href="/offer"
                  className="rounded-xl bg-cyan-400 px-3 py-2.5 text-center font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Begär offert
                </Link>
                <Link
                  href="mailto:sales@signportal.se?subject=Demo%20av%20Signportal"
                  className="rounded-xl border border-white/30 px-3 py-2.5 text-center font-semibold text-white hover:bg-white/10"
                >
                  Boka demo
                </Link>
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/20 px-3 py-2.5 text-center text-slate-200 hover:bg-white/10"
                >
                  Se adminflöde
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d7e0ea] bg-white px-5 py-5 sm:px-7">
          <p className="text-center text-sm font-semibold text-slate-700">Fler än 12 000 kunder förlitar sig på Signportal</p>
          <div className="mt-4">
            <CompanyCarousel companies={customerLogos} />
          </div>
        </section>

        <section className="mt-10 px-4 sm:px-0">
          <h2 className="text-center text-3xl font-semibold leading-tight text-slate-900">Lösningar för digital signatur och eID</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-slate-600">
            Samma trygga grund, olika paketering för hur team arbetar med avtal, onboarding och återkommande processer.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="marketing-card overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="relative h-28">
                  <Image
                    src={solutionImages[index]}
                    alt={`Illustration för ${step.title}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold tracking-[0.15em] text-slate-500">LÖSNING {index + 1}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="section-divider mt-8" aria-hidden />

        <section className="mt-10 rounded-3xl bg-white px-6 py-8 sm:px-10">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Tillit och säkerhet i varje steg</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            Infrastruktur och processer byggda för företag med höga krav på spårbarhet, identitet och dataskydd.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="marketing-card rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🔐</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Verifierad identitet</p>
              <p className="mt-1 text-xs text-slate-600">BankID-inloggning och säkrad länkhantering</p>
            </article>
            <article className="marketing-card rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🛡️</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">ISO-riktad struktur</p>
              <p className="mt-1 text-xs text-slate-600">Audit-spår, serverlogik och kontrollerad access</p>
            </article>
            <article className="marketing-card rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">⚖️</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">eIDAS-kompatibel process</p>
              <p className="mt-1 text-xs text-slate-600">Tydlig signeringskedja för juridisk trygghet</p>
            </article>
            <article className="marketing-card rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
              <p className="text-2xl">🇪🇺</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">EU-fokuserad datahantering</p>
              <p className="mt-1 text-xs text-slate-600">Privat lagring och kontrollerad nedladdning</p>
            </article>
          </div>
        </section>

        <div className="section-divider mt-8" aria-hidden />

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

        <section className="mt-10 overflow-hidden rounded-3xl bg-[#0a76d8] text-white">
          <div className="grid gap-6 px-6 py-9 sm:px-10 lg:grid-cols-[1.15fr_0.85fr]">
            <article>
              <p className="text-xs font-semibold tracking-[0.2em] text-cyan-100">KOM IGÅNG IDAG</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Kom igång med e-signering på riktigt</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-cyan-50">
                Vi hjälper dig sätta upp rätt flöde för offert, onboarding och signering. Från första kund till fullt
                team i drift.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/offer" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a76d8] hover:bg-slate-100">
                  Prata med sälj
                </Link>
                <Link href="/signup/demo-token" className="rounded-full border border-white/45 px-5 py-3 text-sm font-semibold hover:bg-white/10">
                  Testa gratis
                </Link>
              </div>
            </article>
            <article className="rounded-2xl border border-white/25 bg-white/10 p-5 text-sm">
              <p className="font-semibold">Vi hjälper dig att komma live snabbt</p>
              <ul className="mt-3 space-y-2 text-cyan-50">
                <li>• Setup av avtal och mallar</li>
                <li>• Import av befintliga processer</li>
                <li>• Teknisk onboarding för team</li>
              </ul>
            </article>
          </div>
        </section>

        <footer className="mt-6 rounded-3xl bg-[#f4f7fa] px-6 py-8 sm:px-10">
          <div className="grid gap-8 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-semibold text-slate-900">Varför Signportal?</p>
              <p className="mt-3 leading-7">
                En svensk plattform för avtalshantering med enterprise-känsla, hög säkerhet och snabb implementation.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Produkter</p>
              <ul className="mt-3 space-y-2">
                <li>E-signering</li>
                <li>Avtalsflöden</li>
                <li>Påminnelser</li>
                <li>Adminpanel</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Resurser</p>
              <ul className="mt-3 space-y-2">
                <li>Guides</li>
                <li>Driftstatus</li>
                <li>API-dokumentation</li>
                <li>Kundcase</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Kontakt</p>
              <ul className="mt-3 space-y-2">
                <li>sales@signportal.se</li>
                <li>support@signportal.se</li>
                <li>+46 8 123 45 67</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Signportal. Alla rättigheter förbehållna.
          </div>
        </footer>
      </main>
    </div>
  );
}
