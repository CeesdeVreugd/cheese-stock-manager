"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Er ging iets mis, probeer het opnieuw.");
      setStep("code");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ongeldige code");
      router.push("/pincode/instellen");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8">
      <div className="mb-8">
        <img src="/logo-emblem.png" alt="Van Beek & De Vreugd Kaas" className="h-14 w-auto mb-3" />
        <div className="text-xs uppercase tracking-wide text-inkSoft mb-1">Van Beek &amp; De Vreugd Kaas</div>
        <h1 className="font-serif text-2xl font-semibold text-green">
          {step === "email" ? "Welkom terug" : "Check je e-mail"}
        </h1>
        <p className="text-sm text-inkSoft mt-2">
          {step === "email"
            ? "Vul je e-mailadres in. Je ontvangt een eenmalige inlogcode."
            : `We hebben een code gestuurd naar ${email}.`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-green mb-1.5">E-mailadres</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@beekvreugdkaas.nl"
              className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60"
          >
            {busy ? "Versturen…" : "Stuur inlogcode"}
          </button>
          <div className="flex gap-2.5 rounded-xl bg-greenSoft p-3.5">
            <p className="text-xs leading-relaxed text-green">
              Geen wachtwoord nodig. Draai je dit lokaal zonder e-mailservice? Dan verschijnt de
              code in de servertermina.
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-green mb-1.5">Inlogcode</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3 text-center text-lg font-semibold tracking-[0.5em]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60"
          >
            {busy ? "Controleren…" : "Bevestig code"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-xs text-inkSoft underline"
          >
            Ander e-mailadres gebruiken
          </button>
        </form>
      )}
    </div>
  );
}
