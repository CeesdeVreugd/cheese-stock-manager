// Leest de VAPID-sleutels uit de omgeving van de draaiende server.
//
// Belangrijk: Next.js "bakt" variabelen die met NEXT_PUBLIC_ beginnen bij het
// BOUWEN van de app in de code. In Docker bestaan de variabelen dan nog niet,
// waardoor de sleutel leeg in de app kwam te staan. Daarom lezen we hier met
// een dynamische naam (wordt niet ingebakken) en kijken we eerst naar
// VAPID_PUBLIC_KEY en daarna naar de oude naam NEXT_PUBLIC_VAPID_PUBLIC_KEY.
export function vapidPublicKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const sleutel = env["VAPID_PUBLIC_KEY"] || env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
  return sleutel && sleutel.trim() ? sleutel.trim() : null;
}

export function vapidPrivateKey(): string | null {
  const env = process.env as Record<string, string | undefined>;
  const sleutel = env["VAPID_PRIVATE_KEY"];
  return sleutel && sleutel.trim() ? sleutel.trim() : null;
}
