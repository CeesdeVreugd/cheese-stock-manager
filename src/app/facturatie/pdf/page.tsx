import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { huidigeGeneratieDatum, weekLabel, getFacturatieOverzicht } from "@/lib/facturatie";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import PdfViewer from "./pdf-viewer";

export default async function FacturatiePdfPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canFacturatie) return <GeenToegang />;

  const { week } = await searchParams;
  const generatieDatum = week ? new Date(week) : huidigeGeneratieDatum();
  const overzicht = await getFacturatieOverzicht(generatieDatum);
  const label = weekLabel(overzicht.periode);
  const weekIso = generatieDatum.toISOString();

  return (
    <OntgrendelGate>
      <PdfViewer
        week={weekIso}
        terugHref={`/facturatie?week=${weekIso.slice(0, 10)}`}
        titel={`Facturatie ${label.week}`}
        periode={label.range}
        bestandsnaam={label.bestandsnaam}
        eigenEmail={gebruiker.email}
      />
    </OntgrendelGate>
  );
}
