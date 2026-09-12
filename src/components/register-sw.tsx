"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Stil falen: geen service worker betekent alleen dat installeren
        // niet werkt, de app blijft verder gewoon bruikbaar.
      });
    }
  }, []);
  return null;
}
