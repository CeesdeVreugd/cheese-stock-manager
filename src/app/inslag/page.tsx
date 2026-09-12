"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function newTransactionId() {
  // Wordt aangemaakt zodra het formulier opent, niet pas bij opslaan (§3.2) —
  // zo blijft een dubbelklik of timeout onschadelijk.
  return crypto.randomUUID();
}

export default function InslagPage() {
  const router = useRouter();
  const transactionId = useMemo(newTransactionId, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leveranciers, setLeveranciers] = useState<{ id: string; naam: string }[]>([]);
  const [form, setForm] = useState({
    productafkomst: "",
    proces: "",
    model: "",
    partijcode: "",
    productiedatum: new Date().toISOString().slice(0, 10),
    aantalKazen: "",
    nettoGram: "",
    opmerking: "",
  });

  useEffect(() => {
    fetch("/api/leveranciers")
      .then((r) => r.json())
      .then((d) => setLeveranciers(d.leveranciers || []))
      .catch(() => setLeveranciers([]));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inslag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, ...form, nettoGram: form.nettoGram.replace(",", ".") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      router.push(`/inslag/succes?boxId=${data.box.boxId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green">Inslag</h1>
        <div className="w-12" />
      </div>

      <form onSubmit={submit} className="flex-1 overflow-auto px-5 pb-6 flex flex-col gap-4">
        <div className="flex gap-2.5">
          <div className="flex-1 rounded-xl bg-greenSoft p-3">
            <div className="text-[10px] font-bold text-inkSoft">BOXID</div>
            <div className="text-sm font-semibold text-green">Wordt toegewezen bij opslaan</div>
          </div>
          <div className="flex-1 rounded-xl bg-greenSoft p-3">
            <div className="text-[10px] font-bold text-inkSoft">INSLAGTIJD</div>
            <div className="text-sm font-semibold text-green">Nu</div>
          </div>
        </div>

        <Field label="Productafkomst">
          <select required value={form.productafkomst} onChange={(e) => update("productafkomst", e.target.value)} className="input">
            <option value="" disabled>
              Kies productafkomst
            </option>
            {leveranciers.map((l) => (
              <option key={l.id} value={l.naam}>
                {l.naam}
              </option>
            ))}
          </select>
          {leveranciers.length === 0 && (
            <p className="text-[11px] text-inkSoft mt-1">
              Nog geen leveranciers ingesteld —{" "}
              <Link href="/leveranciers" className="underline">
                beheer leveranciers
              </Link>
            </p>
          )}
        </Field>
        <Field label="Proces">
          <input required value={form.proces} onChange={(e) => update("proces", e.target.value)} className="input" />
        </Field>
        <Field label="Model">
          <input required value={form.model} onChange={(e) => update("model", e.target.value)} className="input" />
        </Field>
        <Field label="Partijcode" hint="10 cijfers">
          <input
            required
            value={form.partijcode}
            onChange={(e) => update("partijcode", e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="input"
            placeholder="10 cijfers"
          />
        </Field>
        <Field label="Productiedatum">
          <input
            required
            type="date"
            value={form.productiedatum}
            onChange={(e) => update("productiedatum", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Aantal kazen">
          <input
            required
            type="number"
            min={1}
            value={form.aantalKazen}
            onChange={(e) => update("aantalKazen", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Netto gewicht (kg)">
          <input
            required
            inputMode="decimal"
            value={form.nettoGram}
            onChange={(e) => update("nettoGram", e.target.value)}
            className="input"
            placeholder="0,0"
          />
        </Field>
        <Field label="Opmerking (optioneel)">
          <textarea value={form.opmerking} onChange={(e) => update("opmerking", e.target.value)} className="input h-20" />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={busy} className="mt-2 w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60">
          {busy ? "Opslaan…" : "Opslaan"}
        </button>
        <p className="text-center text-[11px] text-inkSoft">
          Labelprinten (§7 van het ontwerpdocument) volgt in een volgende stap
        </p>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-inkSoft mt-1">{hint}</p>}
    </div>
  );
}
