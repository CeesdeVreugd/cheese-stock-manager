import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canUitslag) return <GeenToegang />;
  return (
    <OntgrendelGate>
      <UitslagForm />
    </OntgrendelGate>
  );
}
