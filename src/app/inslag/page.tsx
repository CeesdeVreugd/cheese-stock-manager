import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import InslagForm from "./inslag-form";

export default async function InslagPage() {
  await vereisOntgrendeldeGebruiker();
  return <InslagForm />;
}
