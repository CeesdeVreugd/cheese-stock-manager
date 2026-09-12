import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "csm_session";
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
}

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
