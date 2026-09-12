"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zetOntgrendeld } from "@/components/ontgrendel-gate";

export default function OntgrendelForm() {
  const router = useRouter();
  const [pincode, setPincode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pincode/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "GEEN_SESSIE" || data.error === "GEEN_TOESTEL" || data.error === "GEEN_PINCODE" || data.error === "VERLOPEN") {
          router.push("/login");
          return;
        }
        throw new Error(data.message || "Onjuiste pincode");
      }
      zetOntgrendeld();
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setPincode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8">
      <div className="mb-8">
        <img src="/logo-emblem.png" alt="Van Beek & De Vreugd Kaas" className="h-14 w-auto mb-3" />
        <div className="text-xs uppercase tracking-wide text-inkSoft mb-1">Van Beek &amp; De Vreugd Kaas</div>
        <h1 className="font-serif text-2xl font-semibold text-green">Welkom terug</h1>
        <p className="text-sm text-inkSoft mt-2">Voer je pincode in om verder te gaan.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3 text-center text-2xl font-semibold tracking-[0.5em]"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          disabled={busy || pincode.length < 4}
          className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60"
        >
          {busy ? "Controleren…" : "Ontgrendelen"}
        </button>
        <a href="/login" className="text-center text-xs text-inkSoft underline">
          Toch met e-mail inloggen
        </a>
      </form>
    </div>
  );
}
