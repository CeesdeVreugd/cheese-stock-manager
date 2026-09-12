import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import InslagForm from "./inslag-form";

export default async function InslagPage() {
  await vereisOntgrendeldeGebruiker();
  return (
    <OntgrendelGate>
      <InslagForm />
    </OntgrendelGate>
  );
}
