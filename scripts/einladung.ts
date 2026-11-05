// Erzeugt eine einmal gültige Einladung: npm run einladung [-- --lokal]
import { einladungSql } from "../worker/betrieb.ts";
import { geheimnisErzeugen, geheimnisHash } from "../worker/geheimnis.ts";
import { ADRESSE, sqlAusfuehren } from "./datenbank.ts";

const code = geheimnisErzeugen();
sqlAusfuehren(einladungSql(await geheimnisHash(code)));
console.log(`${ADRESSE}/registrieren?code=${code}`);
