import { redirect } from "next/navigation";
import { getSessionGebruikerId } from "@/lib/auth";
import OntgrendelForm from "./ontgrendel-form";

export default async function OntgrendelPage() {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) redirect("/login");

  return <OntgrendelForm />;
}
