"use client";

import Image from "next/image";
import { useMemo } from "react";

type CompanyCarouselProps = {
  companies: Array<{
    name: string;
    logo: string;
  }>;
};

export default function CompanyCarousel({ companies }: CompanyCarouselProps) {
  const loopedCompanies = useMemo(() => {
    return [...companies, ...companies];
  }, [companies]);

  return (
    <div className="company-marquee">
      <div className="company-marquee__track">
        {loopedCompanies.map((company, index) => (
          <div key={`${company.name}-${index}`} className="company-marquee__item" aria-label={company.name}>
            <Image
              src={company.logo}
              alt={`Logotyp för ${company.name}`}
              width={220}
              height={64}
              className="company-marquee__logo"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
