"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Houdt per tabblad bij welke pagina's van de app je na elkaar hebt bezocht.
// Zo gaat "Terug" echt naar de vorige pagina (en niet blind naar het
// hoofdscherm, of twee stappen te ver als je via een andere weg kwam).
const SLEUTEL = "csm_pad_stapel";

function leesStapel(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(SLEUTEL) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function schrijfStapel(s: string[]) {
  try {
    sessionStorage.setItem(SLEUTEL, JSON.stringify(s.slice(-30)));
  } catch {
    /* sessionStorage kan geblokkeerd zijn; dan valt Terug terug op de vaste pagina */
  }
}

export function PadVolger() {
  const pad = usePathname();
  useEffect(() => {
    const stapel = leesStapel();
    const top = stapel[stapel.length - 1];
    if (top === pad) return;
    if (stapel.length >= 2 && stapel[stapel.length - 2] === pad) {
      stapel.pop(); // we zijn een stap teruggegaan
    } else {
      stapel.push(pad);
    }
    schrijfStapel(stapel);
  }, [pad]);
  return null;
}

export default function TerugKnop({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function terug() {
    if (leesStapel().length >= 2) {
      router.back();
    } else {
      router.push(href);
    }
  }

  return (
    <button type="button" onClick={terug} className={className}>
      {children}
    </button>
  );
}
