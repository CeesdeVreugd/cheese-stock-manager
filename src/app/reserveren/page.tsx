import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import ReserverenForm from "./reserveren-form";

export default async function ReserverenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canReserveren) return <GeenToegang />;
  return (
    <OntgrendelGate>
      <ReserverenForm />
    </OntgrendelGate>
  );
}
