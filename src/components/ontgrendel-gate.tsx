"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const VLAG = "csm_unlocked";

export default function OntgrendelGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(VLAG) === "1") {
      setOk(true);
    } else {
      router.replace("/ontgrendel");
    }
    // Bewust geen dependency op pathname: dit hoeft maar één keer per
    // "app-opening" gecontroleerd te worden, niet bij elke navigatie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ok) return null;
  return <>{children}</>;
}

export function zetOntgrendeld() {
  sessionStorage.setItem(VLAG, "1");
}

export function wisOntgrendeld() {
  sessionStorage.removeItem(VLAG);
}
