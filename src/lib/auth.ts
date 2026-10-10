import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessieUren } from "@/lib/instellingen";
import { bouwMailHtml, bouwMailTekst, type MailInhoud } from "@/lib/mail-template";

const SESSION_COOKIE = "csm_session";
const UNLOCK_COOKIE = "csm_unlocked";
const DEVICE_COOKIE = "csm_device";
// Hoe lang een inlog geldig blijft is instelbaar (Beheer → Instellingen, standaard
// 2 weken, zie ontwerpdocument §4.3) en komt uit lib/instellingen.ts.

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
export function createSessionToken(gebruikerId: string, uren: number): string {
  const verlooptOp = Date.now() + uren * 60 * 60 * 1000;
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
  const uren = await getSessieUren();
  const token = createSessionToken(gebruikerId, uren);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: uren * 60 * 60,
  });
}

export async function getSessionGebruikerId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// Haalt de volledige gebruiker op (incl. rol met rechten) — nodig voor
// schermen/acties die op specifieke rechten controleren (§4.4: rolcontrole
// hoort server-side).
export async function getSessionGebruiker() {
  const id = await getSessionGebruikerId();
  if (!id) return null;
  return prisma.gebruiker.findUnique({ where: { id }, include: { rol: true } });
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

  const gebruiker = await prisma.gebruiker.findUnique({ where: { id: gebruikerId! }, include: { rol: true } });
  if (!gebruiker || gebruiker.status !== "actief") redirect("/login");
  // rol is optioneel in het schema (zie §-opmerking bij het model) zodat
  // het toevoegen van dit veld destijds geen destructieve migratie was;
  // db:seed kent echter altijd een rol toe, dus dit zou zich in de praktijk
  // niet moeten voordoen. Als het toch gebeurt: veilig terug naar login
  // i.p.v. de rest van de app met een onvolledige gebruiker te laten crashen.
  if (!gebruiker.rol) redirect("/login");

  return { ...gebruiker, rol: gebruiker.rol };
}

// Voor API-routes: geen redirect (past niet in een JSON-response), geeft
// null terug bij elke vorm van "niet toegestaan" zodat de route zelf een
// 401 kan teruggeven.
export async function vereisOntgrendeldeGebruikerApi() {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return null;

  const gebruiker = await prisma.gebruiker.findUnique({ where: { id: gebruikerId }, include: { rol: true } });
  if (!gebruiker || gebruiker.status !== "actief") return null;
  if (!gebruiker.rol) return null;

  return { ...gebruiker, rol: gebruiker.rol };
}

// Legt vast wanneer iemand voor het laatst inlogde (met code of pincode).
// Een fout hierbij mag het inloggen zelf nooit blokkeren.
export async function registreerLogin(gebruikerId: string) {
  try {
    await prisma.gebruiker.update({ where: { id: gebruikerId }, data: { laatsteLogin: new Date() } });
  } catch (err) {
    console.error("Kon laatste login niet vastleggen:", err);
  }
}

// ---------- E-mail versturen ----------

// Kernfunctie: verstuurt willekeurige tekst-e-mail via dezelfde volgorde als
// de inlogcodes — Microsoft Graph (Outlook/M365) als dat is ingesteld,
// anders Resend, en zonder allebei verschijnt de tekst in de servertermina.
async function verstuurEmail(email: string, onderwerp: string, tekst: string, devLabel: string, html?: string) {
  const gebruiktGraph = process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET;
  if (gebruiktGraph) {
    const { verstuurMailViaGraph } = await import("@/lib/graph-mail");
    await verstuurMailViaGraph(email, onderwerp, tekst, html);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n[DEV] ${devLabel} voor ${email}:\n${tekst}\n`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM || "Cheese Stock Manager <inloggen@example.com>",
    to: email,
    subject: onderwerp,
    text: tekst,
    ...(html ? { html } : {}),
  });
}

function logoUrlVoor(appUrl?: string) {
  const basis = (process.env.APP_URL || appUrl || "").replace(/\/+$/, "");
  return basis ? `${basis}/logo-emblem.png` : undefined;
}

export async function sendLoginCode(email: string, code: string, naam?: string, appUrl?: string) {
  const onderwerp = "Je inlogcode voor Cheese Stock Manager";
  const inhoud: MailInhoud = {
    aanhef: naam ? `Hallo ${naam},` : "Hallo,",
    regelsVoor: ["Je inlogcode voor Cheese Stock Manager is:"],
    code,
    regelsNa: ["De code is 10 minuten geldig. Heb je niet geprobeerd in te loggen? Dan kun je deze mail negeren."],
    logoUrl: logoUrlVoor(appUrl),
  };
  await verstuurEmail(email, onderwerp, bouwMailTekst(inhoud), "Inlogcode", bouwMailHtml(inhoud));
}

// Uitnodigingsmail voor een nieuw aangemaakte gebruiker. De link wijst naar
// de startpagina van de app — dat leidt vanzelf naar /login, en na de
// eerste succesvolle e-mail+code-login wordt automatisch om een pincode
// gevraagd (§4.2/§4.3). Er is dus bewust geen apart activatie-token nodig.
export async function sendUitnodiging(email: string, naam: string, appUrl: string) {
  const onderwerp = "Uitnodiging voor Cheese Stock Manager";
  const inhoud: MailInhoud = {
    aanhef: `Hallo ${naam},`,
    regelsVoor: [
      "Je bent uitgenodigd om de Cheese Stock Manager van Van Beek & De Vreugd Kaas te gaan gebruiken.",
      `Klik op de knop om je account te activeren en log in met dit e-mailadres (${email}). Je ontvangt dan een eenmalige inlogcode en wordt daarna gevraagd een pincode aan te maken voor snelle toegang op dit toestel.`,
    ],
    knop: { tekst: "Naar Cheese Stock Manager", url: appUrl },
    logoUrl: logoUrlVoor(appUrl),
  };
  await verstuurEmail(email, onderwerp, bouwMailTekst(inhoud), "Uitnodiging", bouwMailHtml(inhoud));
}
