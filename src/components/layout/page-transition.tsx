"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div key={`${pathname}?${searchParams.toString()}`} className="animate-fade-in-up">
      {children}
    </div>
  );
}
