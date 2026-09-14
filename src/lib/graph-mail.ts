// Verstuurt e-mail via de Microsoft Graph API, met een app-only (client
// credentials) inlog — geen gebruiker hoeft in te loggen, de app stuurt
// namens een vast Microsoft 365-mailadres (bv. een gedeelde mailbox).
// Vereist in Microsoft Entra ID: een app-registratie met de
// applicatie-permissie "Mail.Send" (met beheerderstoestemming). Zie de
// README voor de volledige instelstappen.

let gecachedToken: { token: string; verlooptOp: number } | null = null;

async function haalGraphToken(): Promise<string> {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph-instellingen ontbreken (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET)");
  }

  // Hergebruik het token zolang het nog minstens een minuut geldig is —
  // scheelt een extra aanroep bij elke inlogcode.
  if (gecachedToken && gecachedToken.verlooptOp > Date.now() + 60_000) {
    return gecachedToken.token;
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const tekst = await res.text().catch(() => "");
    throw new Error(`Token ophalen bij Microsoft mislukt (${res.status}): ${tekst}`);
  }

  const data = await res.json();
  gecachedToken = { token: data.access_token, verlooptOp: Date.now() + data.expires_in * 1000 };
  return gecachedToken.token;
}

export async function verstuurMailViaGraph(naar: string, onderwerp: string, tekst: string) {
  const afzender = process.env.MS_SENDER_EMAIL;
  if (!afzender) {
    throw new Error("MS_SENDER_EMAIL ontbreekt — dit moet het mailadres zijn waarvandaan verstuurd wordt");
  }

  const token = await haalGraphToken();

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(afzender)}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: onderwerp,
        body: { contentType: "Text", content: tekst },
        toRecipients: [{ emailAddress: { address: naar } }],
      },
      saveToSentItems: false,
    }),
  });

  if (!res.ok) {
    const tekstFout = await res.text().catch(() => "");
    throw new Error(`Versturen via Microsoft Graph mislukt (${res.status}): ${tekstFout}`);
  }
}
