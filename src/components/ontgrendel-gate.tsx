"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const VLAG = "csm_unlocked";

export default function OntgrendelGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    function controleer() {
      if (sessionStorage.getItem(VLAG) === "1") {
        setOk(true);
      } else {
        setOk(false);
        router.replace("/ontgrendel");
      }
    }

    controleer();

    // "Wegvegen" op mobiel (of naar de achtergrond zetten) beëindigt de
    // pagina meestal niet echt — het toestel pauzeert 'm alleen, waardoor
    // sessionStorage anders gewoon zou blijven bestaan bij terugkeer. Om dit
    // toch als "opnieuw geopend" te laten voelen: zodra de app naar de
    // achtergrond gaat, direct vergrendelen. Bij terugkeer moet dan sowieso
    // opnieuw de pincode ingevoerd worden, ongeacht hoe kort dit was.
    function bijZichtbaarheidVerandering() {
      if (document.hidden) {
        sessionStorage.removeItem(VLAG);
      } else {
        controleer();
      }
    }

    document.addEventListener("visibilitychange", bijZichtbaarheidVerandering);
    return () => document.removeEventListener("visibilitychange", bijZichtbaarheidVerandering);
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

