"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zetOntgrendeld } from "@/components/ontgrendel-gate";

export default function PincodeInstellenForm() {
  const router = useRouter();
  const [pincode, setPincode] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[0-9]{4,6}$/.test(pincode)) {
      setError("Pincode moet 4 tot 6 cijfers zijn.");
      return;
    }
    if (pincode !== herhaal) {
      setError("De twee pincodes komen niet overeen.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/pincode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Instellen mislukt");
      zetOntgrendeld();
      router.push("/dashboard");
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
        <h1 className="font-serif text-2xl font-semibold text-green">Stel je pincode in</h1>
        <p className="text-sm text-inkSoft mt-2">
          Hiermee open je de app voortaan snel op dit toestel, zonder steeds een nieuwe e-mailcode. Om de
          twee weken vragen we opnieuw om in te loggen met e-mail.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-green mb-1.5">Pincode (4-6 cijfers)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3 text-center text-lg font-semibold tracking-[0.4em]"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-green mb-1.5">Herhaal pincode</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={herhaal}
            onChange={(e) => setHerhaal(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border-[1.5px] border-line px-3.5 py-3 text-center text-lg font-semibold tracking-[0.4em]"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60"
        >
          {busy ? "Instellen…" : "Pincode instellen"}
        </button>
      </form>
    </div>
  );
}
