"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toonIosHint, setToonIosHint] = useState(false);
  const [verborgen, setVerborgen] = useState(true);

  useEffect(() => {
    // Al geïnstalleerd/geopend als standalone app? Dan nooit tonen.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (isStandalone) return;

    if (sessionStorage.getItem("csm-install-weggeklikt") === "1") return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      setToonIosHint(true);
      setVerborgen(false);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVerborgen(false);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function sluiten() {
    setVerborgen(true);
    sessionStorage.setItem("csm-install-weggeklikt", "1");
  }

  async function installeren() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVerborgen(true);
  }

  if (verborgen) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl bg-greenSoft p-3 flex items-start gap-2.5">
      <img src="/logo-emblem.png" alt="" className="h-8 w-auto flex-shrink-0" />
      <div className="flex-1">
        {toonIosHint ? (
          <p className="text-xs text-green leading-relaxed">
            Zet deze app op je beginscherm: tik op <strong>Deel</strong> onderin Safari, en dan op{" "}
            <strong>Zet op beginscherm</strong>.
          </p>
        ) : (
          <>
            <p className="text-xs text-green leading-relaxed mb-2">
              Installeer Cheese Stock Manager als app op dit toestel.
            </p>
            <button onClick={installeren} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-white">
              Installeren
            </button>
          </>
        )}
      </div>
      <button onClick={sluiten} className="text-inkSoft text-sm leading-none px-1">
        ×
      </button>
    </div>
  );
}
