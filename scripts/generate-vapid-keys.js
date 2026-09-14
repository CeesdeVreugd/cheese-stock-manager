// Genereert een nieuw VAPID-sleutelpaar voor webpush-meldingen.
// Draai met: node scripts/generate-vapid-keys.js
// Zet de uitkomst in je .env (en in Vercel's environment variables).
const crypto = require("crypto");

const ecdh = crypto.createECDH("prime256v1");
ecdh.generateKeys();

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

console.log("Zet dit in je .env-bestand (en in Vercel):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${b64url(ecdh.getPublicKey())}`);
console.log(`VAPID_PRIVATE_KEY=${b64url(ecdh.getPrivateKey())}`);
console.log(
  "\nLet op: als je deze wijzigt, moet iedereen die meldingen had ingeschakeld dit opnieuw doen " +
    "(oude abonnementen werken niet meer met een nieuwe sleutel)."
);
