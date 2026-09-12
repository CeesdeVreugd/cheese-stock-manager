import { redirect } from "next/navigation";
import { getSessionGebruikerId } from "@/lib/auth";

export default async function Home() {
  const gebruikerId = await getSessionGebruikerId();
  redirect(gebruikerId ? "/dashboard" : "/login");
}
