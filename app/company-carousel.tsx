"use client";

import { useMemo, useState } from "react";

type CompanyCarouselProps = {
  companies: string[];
};

const VISIBLE_CARDS = 3;

export default function CompanyCarousel({ companies }: CompanyCarouselProps) {
  const [index, setIndex] = useState(0);

  const maxIndex = Math.max(0, companies.length - VISIBLE_CARDS);

  const visibleCompanies = useMemo(() => {
    return companies.slice(index, index + VISIBLE_CARDS);
  }, [companies, index]);

  const goPrev = () => {
    setIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev === maxIndex ? 0 : prev + 1));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          aria-label="Föregående företag"
        >
          ←
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          aria-label="Nästa företag"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {visibleCompanies.map((company) => (
          <div
            key={company}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-600"
          >
            {company}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            onClick={() => setIndex(dotIndex)}
            className={`h-2 w-2 rounded-full ${dotIndex === index ? "bg-[var(--brand)]" : "bg-slate-300"}`}
            aria-label={`Gå till position ${dotIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
