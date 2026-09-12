import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "csm_session";
const UNLOCK_COOKIE = "csm_unlocked";
const DEVICE_COOKIE = "csm_device";
const SESSION_DAYS = 14; // harde 2-weken-grens, zie ontwerpdocument §4.3

function secret() {
  return process.env.SESSION_SECRET || "dev-only-onveilige-fallback-sleutel";
}

export function generateSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

// ---------- Volledige login-sessie (e-mail + code, §4.2) ----------

// Simpel, afhankelijkheidsvrij session-token: "<gebruikerId>.<verlooptOp>.<handtekening>"
export function createSessionToken(gebruikerId: string): string {
  const verlooptOp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${gebruikerId}.${verlooptOp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [gebruikerId, verlooptOpStr, handtekening] = token.split(".");
  if (!gebruikerId || !verlooptOpStr || !handtekening) return null;
  const payload = `${gebruikerId}.${verlooptOpStr}`;
  if (sign(payload) !== handtekening) return null;
  if (Date.now() > Number(verlooptOpStr)) return null;
  return gebruikerId;
}

export async function setSessionCookie(gebruikerId: string) {
  const token = createSessionToken(gebruikerId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSessionGebruikerId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// Haalt de volledige gebruiker op (incl. rol) — nodig voor schermen/acties
// die alleen voor een beheerder bedoeld zijn (§4.4: rolcontrole hoort server-side).
export async function getSessionGebruiker() {
  const id = await getSessionGebruikerId();
  if (!id) return null;
  return prisma.gebruiker.findUnique({ where: { id } });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(UNLOCK_COOKIE);
}

// ---------- Toestel-id (§3.5 device_pincodes) ----------

// Alleen leesbaar in Server Components; het aanmaken (schrijven) gebeurt in
// de route handlers hieronder, want alleen die mogen cookies zetten.
export async function getDeviceIdReadOnly(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value || null;
}

export async function ensureDeviceId(): Promise<string> {
  const store = await cookies();
  const bestaand = store.get(DEVICE_COOKIE)?.value;
  if (bestaand) return bestaand;
  const nieuw = crypto.randomUUID();
  store.set(DEVICE_COOKIE, nieuw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60, // toestel-id mag lang blijven staan
  });
  return nieuw;
}

// ---------- Ontgrendel-status (pincode, §4.3) ----------
// Belangrijk: dit wordt NIET meer via een cookie bijgehouden. Een cookie
// zonder vervaldatum ("session cookie") blijkt in de praktijk onbetrouwbaar
// bij "sluit de browser" — Chrome kan achtergrond-apps laten doordraaien,
// geïnstalleerde PWA's en mobiel sessieherstel laten zo'n cookie vaak gewoon
// bestaan. In plaats daarvan zet de client (na een geslaagde pincode-invoer)
// een vlag in sessionStorage, wat wél betrouwbaar leeg is bij een echte
// herstart. Zie components/ontgrendel-gate.tsx voor de client-side check.
//
// Dit betekent ook: de pincode is een gebruiksvriendelijke vergrendeling
// bovenop een al geldige sessie, geen extra API-beveiligingslaag — de API's
// blijven beschermd door de gewone 2-wekelijkse sessie hieronder.

// Voor Server Component-pagina's: redirect zelf bij een ontbrekende/verlopen
// sessie, of bij een geblokkeerde gebruiker. Geeft de volledige gebruiker
// terug. De pincode-controle zelf gebeurt client-side, zie OntgrendelGate.
export async function vereisOntgrendeldeGebruiker() {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) redirect("/login");

  const gebruiker = await prisma.gebruiker.findUnique({ where: { id: gebruikerId! } });
  if (!gebruiker || gebruiker.status !== "actief") redirect("/login");

  return gebruiker;
}

// Voor API-routes: geen redirect (past niet in een JSON-response), geeft
// null terug bij elke vorm van "niet toegestaan" zodat de route zelf een
// 401 kan teruggeven.
export async function vereisOntgrendeldeGebruikerApi() {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return null;

  const gebruiker = await prisma.gebruiker.findUnique({ where: { id: gebruikerId } });
  if (!gebruiker || gebruiker.status !== "actief") return null;

  return gebruiker;
}

// ---------- E-mail versturen ----------

// Verstuurt de inlogcode via Resend als er een API-sleutel is ingesteld.
// Zonder sleutel (lokaal testen, gratis-tier zonder e-mail) verschijnt de
// code in de servertermina — zo kun je zonder een cent uit te geven inloggen.
export async function sendLoginCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n[DEV] Inlogcode voor ${email}: ${code}\n`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM || "Cheese Stock Manager <inloggen@example.com>",
    to: email,
    subject: "Je inlogcode voor Cheese Stock Manager",
    text: `Je eenmalige inlogcode is: ${code}\n\nDeze code is 10 minuten geldig.`,
  });
}
