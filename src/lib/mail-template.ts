// HTML-opmaak voor de e-mails van de app (inlogcode, uitnodiging), in de
// huisstijl van Van Beek & De Vreugd Kaas. E-mailprogramma's ondersteunen
// geen moderne CSS, dus: tabellen, inline stijlen en veilige lettertypen.

const GROEN = "#223B2C";
const GOUD = "#E3A628";
const INKT = "#2B2620";
const INKT_ZACHT = "#756C5E";
const LIJN = "#EDE4D1";
const ROOM = "#FFFDF8";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type MailInhoud = {
  aanhef: string; // "Hallo Cees de Vreugd,"
  regelsVoor: string[]; // alinea's vóór de code of knop
  code?: string; // grote inlogcode
  knop?: { tekst: string; url: string };
  regelsNa?: string[]; // alinea's erna
  logoUrl?: string; // absolute URL naar het embleem; zonder logo blijft de naam staan
};

export function bouwMailHtml(m: MailInhoud): string {
  const alinea = (t: string) =>
    `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:${INKT};">${esc(t)}</p>`;

  // Code in een eigen vakje, met gewone (lining) cijfers: Georgia toont cijfers
  // met "oude stijl" (9 en 0 zakken onder de regel) en dat oogt rommelig.
  const codeBlok = m.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px 0;"><tr>
         <td style="background:${ROOM};border:2px solid ${GOUD};border-radius:12px;padding:14px 26px;">
           <span style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:38px;font-weight:bold;letter-spacing:10px;color:${GROEN};">${esc(m.code)}</span>
         </td></tr></table>`
    : "";

  const knopBlok = m.knop
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px 0;"><tr><td style="background:${GOUD};border-radius:10px;">
         <a href="${esc(m.knop.url)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(m.knop.tekst)}</a>
       </td></tr></table>`
    : "";

  const logo = m.logoUrl
    ? `<img src="${esc(m.logoUrl)}" alt="Van Beek &amp; De Vreugd Kaas" width="96" style="display:block;border:0;height:auto;margin:0 0 12px 0;">`
    : "";

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;"><tr><td align="left" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${LIJN};border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="background:${GROEN};padding:16px 24px;border-bottom:3px solid ${GOUD};">
      <span style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#ffffff;">CHEESE STOCK MANAGER</span>
    </td></tr>
    <tr><td style="padding:24px 24px 8px 24px;">
      ${alinea(m.aanhef)}
      ${m.regelsVoor.map(alinea).join("")}
      ${codeBlok}
      ${knopBlok}
      ${(m.regelsNa ?? []).map(alinea).join("")}
      <p style="margin:6px 0 4px 0;font-size:14px;line-height:1.55;color:${INKT};">Met vriendelijke groet,</p>
      <p style="margin:0 0 20px 0;font-size:14px;line-height:1.55;color:${INKT};">Systeembeheer | Van Beek &amp; De Vreugd Kaas</p>
    </td></tr>
    <tr><td style="padding:0 24px 22px 24px;">
      <div style="border-top:1px solid ${LIJN};padding-top:16px;">
        ${logo}
        <p style="margin:0;font-size:13px;line-height:1.6;color:${INKT};">Planckstraat 12, 3902 HS Veenendaal<br>
        <a href="mailto:info@beekvreugdkaas.nl" style="color:${GROEN};">info@beekvreugdkaas.nl</a></p>
      </div>
    </td></tr>
    <tr><td style="background:${ROOM};border-top:1px solid ${LIJN};padding:12px 24px;">
      <span style="font-size:12px;font-weight:bold;letter-spacing:1px;color:${GOUD};">VAN BEEK &amp; DE VREUGD KAAS</span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Platte-tekstversie voor mailprogramma's die geen HTML tonen (en voor Resend).
export function bouwMailTekst(m: MailInhoud): string {
  const delen = [m.aanhef, ...m.regelsVoor];
  if (m.code) delen.push(m.code);
  if (m.knop) delen.push(`${m.knop.tekst}: ${m.knop.url}`);
  delen.push(...(m.regelsNa ?? []));
  delen.push("Met vriendelijke groet,\nSysteembeheer | Van Beek & De Vreugd Kaas");
  return delen.join("\n\n");
}

export { INKT_ZACHT };
