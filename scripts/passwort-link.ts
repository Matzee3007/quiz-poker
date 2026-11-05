// Erzeugt einen Link zum Zurücksetzen, 24 Stunden und einmal gültig: npm run passwort-link -- <email> [--lokal]
import { linkGueltigBis, passwortLinkSql } from "../worker/betrieb.ts";
import { geheimnisErzeugen, geheimnisHash } from "../worker/geheimnis.ts";
import { ADRESSE, sqlAusfuehren } from "./datenbank.ts";

const email = process.argv.slice(2).find((wert) => !wert.startsWith("--"));
if (!email) {
  console.error("Aufruf: npm run passwort-link -- <email> [--lokal]");
  process.exit(1);
}

const token = geheimnisErzeugen();
sqlAusfuehren(
  passwortLinkSql(
    await geheimnisHash(token),
    email,
    linkGueltigBis(Date.now()),
  ),
);
console.log(`${ADRESSE}/passwort-neu?token=${token}`);
