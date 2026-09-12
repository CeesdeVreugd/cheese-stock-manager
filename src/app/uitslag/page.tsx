import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage() {
  await vereisOntgrendeldeGebruiker();
  return <UitslagForm />;
}
