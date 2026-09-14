"use client";

import { useEffect } from "react";
import { pushWordtOndersteund, huidigPushAbonnement, schakelPushIn } from "@/lib/push-client";

// Staat standaard "aan": zodra iemand met afroep-rechten de app opent en er
// nog geen abonnement of eerdere weigering bekend is, wordt er direct
// geprobeerd te abonneren. De browser vraagt daarbij zelf om toestemming.
// Wil iemand dit niet, dan zet die het uit via Profiel — daarna proberen we
// het hier niet nogmaals (we respecteren zowel "geweigerd" als "uitgezet").
export default function AutoMeldingen() {
  useEffect(() => {
    async function probeer() {
      if (!pushWordtOndersteund()) return;
      if (Notification.permission === "denied") return;

      const bestaand = await huidigPushAbonnement();
      if (bestaand) return; // al ingeschakeld

      try {
        await schakelPushIn();
      } catch {
        // Toestemming geweigerd of iets anders misgegaan — gewoon stil
        // laten liggen, gebruiker kan het altijd handmatig proberen via
        // Profiel.
      }
    }
    probeer();
  }, []);

  return null;
}
