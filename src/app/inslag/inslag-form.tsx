"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function newTransactionId() {
  // Wordt aangemaakt zodra het formulier opent, niet pas bij opslaan (§3.2) —
  // zo blijft een dubbelklik of timeout onschadelijk.
  return crypto.randomUUID();
}

export default function InslagForm() {
  const router = useRouter();
  const transactionId = useMemo(newTransactionId, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validaties, setValidaties] = useState<{
    productafkomst: { id: string; naam: string }[];
    proces: { id: string; naam: string }[];
    model: { id: string; naam: string }[];
  }>({ productafkomst: [], proces: [], model: [] });
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
    Promise.all(
      (["productafkomst", "proces", "model"] as const).map((soort) =>
        fetch(`/api/validaties?soort=${soort}`)
          .then((r) => r.json())
          .then((d) => [soort, d.items || []] as const)
      )
    ).then((paren) => {
      setValidaties((v) => ({ ...v, ...Object.fromEntries(paren) }));
    });
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
    <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-3xl md:mx-auto md:my-10 md:rounded-3xl md:border md:border-line md:shadow-xl md:bg-cream md:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 md:px-8">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green md:text-lg">Inslag</h1>
        <div className="w-12" />
      </div>

      <form onSubmit={submit} className="flex-1 overflow-auto px-5 pb-6 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
        <div className="flex gap-2.5 md:col-span-2">
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
            {validaties.productafkomst.map((l) => (
              <option key={l.id} value={l.naam}>
                {l.naam}
              </option>
            ))}
          </select>
          {validaties.productafkomst.length === 0 && <LeegHint />}
        </Field>
        <Field label="Proces">
          <select required value={form.proces} onChange={(e) => update("proces", e.target.value)} className="input">
            <option value="" disabled>
              Kies proces
            </option>
            {validaties.proces.map((l) => (
              <option key={l.id} value={l.naam}>
                {l.naam}
              </option>
            ))}
          </select>
          {validaties.proces.length === 0 && <LeegHint />}
        </Field>
        <Field label="Model">
          <select required value={form.model} onChange={(e) => update("model", e.target.value)} className="input">
            <option value="" disabled>
              Kies model
            </option>
            {validaties.model.map((l) => (
              <option key={l.id} value={l.naam}>
                {l.naam}
              </option>
            ))}
          </select>
          {validaties.model.length === 0 && <LeegHint />}
        </Field>
        <Field label="Partijcode" hint="10 cijfers">
          <input
            required
            inputMode="numeric"
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
        <Field label="Opmerking (optioneel)" className="md:col-span-2">
          <textarea value={form.opmerking} onChange={(e) => update("opmerking", e.target.value)} className="input h-20" />
        </Field>

        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

        <button disabled={busy} className="mt-2 w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60 md:col-span-2">
          {busy ? "Opslaan…" : "Opslaan"}
        </button>
        <p className="text-center text-[11px] text-inkSoft md:col-span-2">
          Labelprinten (§7 van het ontwerpdocument) volgt in een volgende stap
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className || ""}`}>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-inkSoft mt-1">{hint}</p>}
    </div>
  );
}

function LeegHint() {
  return (
    <p className="text-[11px] text-inkSoft mt-1">
      Nog niets ingesteld —{" "}
      <Link href="/validaties" className="underline">
        beheer validatielijsten
      </Link>
    </p>
  );
}
