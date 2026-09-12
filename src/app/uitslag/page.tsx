import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage() {
  await vereisOntgrendeldeGebruiker();
  return (
    <OntgrendelGate>
      <UitslagForm />
    </OntgrendelGate>
  );
}
