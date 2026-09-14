import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let geconfigureerd = false;
let configuratieOntbreekt = false;

function zorgVoorConfig(): boolean {
  if (geconfigureerd) return true;
  if (configuratieOntbreekt) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@example.com";
  if (!publicKey || !privateKey) {
    // Dit mag NOOIT de aanroepende actie (bv. een afroep aanmaken) laten
    // mislukken — pushmeldingen zijn altijd "best effort" bovenop de
    // eigenlijke handeling. Gewoon loggen en stil overslaan.
    console.error(
      "Pushmeldingen overgeslagen: VAPID-sleutels ontbreken in de omgevingsvariabelen " +
        "(NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Zet deze in Vercel's Environment " +
        "Variables en deploy opnieuw."
    );
    configuratieOntbreekt = true;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  geconfigureerd = true;
  return true;
}

/**
 * Stuurt een pushmelding naar alle ingeschreven toestellen van gebruikers
 * wier rol een bepaald vinkje heeft staan (bv. "ontvangtAfroepMeldingen"),
 * optioneel met uitzondering van één gebruiker (bv. degene die de afroep
 * net zelf aanmaakte, hoeft daar geen melding over te krijgen). Dit is
 * bewust op rolniveau instelbaar (via /rollen), niet per individu — een
 * beheerder bepaalt zo in één keer voor een hele rol of die meldingen krijgt.
 *
 * Faalt bewust nooit hard: een misconfiguratie of een kapot abonnement mag
 * de aanroepende actie (bv. het aanmaken van een afroep) nooit laten mislukken.
 */
export async function stuurPushNaarRecht(
  permissieVeld: "canReserveren" | "canInslag" | "canUitslag" | "canBeheer" | "canActiviteiten" | "ontvangtAfroepMeldingen",
  payload: { title: string; body: string; url?: string },
  uitzonderenGebruikerId?: string
) {
  try {
    if (!zorgVoorConfig()) return;

    const subscripties = await prisma.pushSubscription.findMany({
      where: {
        gebruiker: {
          rol: { [permissieVeld]: true } as any,
          status: "actief",
          ...(uitzonderenGebruikerId ? { id: { not: uitzonderenGebruikerId } } : {}),
        },
      },
    });

    const payloadJson = JSON.stringify(payload);

    await Promise.all(
      subscripties.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadJson
          );
        } catch (err: any) {
          // Een verlopen/ingetrokken abonnement (bv. 410 Gone) mag de rest
          // niet blokkeren — gewoon opruimen en doorgaan met de anderen.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("Pushmelding versturen mislukt:", err?.message || err);
          }
        }
      })
    );
  } catch (err: any) {
    console.error("Pushmeldingen versturen volledig mislukt (actie zelf gaat gewoon door):", err?.message || err);
  }
}
