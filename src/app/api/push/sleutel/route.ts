import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push-config";

// De publieke VAPID-sleutel is niet geheim (de browser heeft hem nodig om
// zich aan te melden voor meldingen). Hij wordt hier bij elk verzoek vanuit de
// omgevingsvariabelen van de draaiende container gelezen, zodat hij niet bij
// het bouwen van de app "ingebakken" hoeft te worden.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sleutel: vapidPublicKey() });
}
