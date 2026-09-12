import { redirect } from "next/navigation";
import { getSessionGebruikerId } from "@/lib/auth";
import PincodeInstellenForm from "./pincode-instellen-form";

export default async function PincodeInstellenPage() {
  // Vereist een geslaagde volledige login (e-mail + code), maar nadrukkelijk
  // NIET al een ontgrendelde sessie — dit scherm ís de ontgrendel-stap.
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) redirect("/login");

  return <PincodeInstellenForm />;
}
