// Löscht ein gespeichertes Quiz: npm run quiz-loeschen -- <id> [--lokal]
import { QUIZ_ID_MUSTER, quizLoeschenSql } from "../worker/betrieb.ts";
import { sqlAusfuehren } from "./datenbank.ts";

const id = process.argv.slice(2).find((wert) => !wert.startsWith("--"));
if (!id || !QUIZ_ID_MUSTER.test(id)) {
  console.error("Aufruf: npm run quiz-loeschen -- <id> [--lokal]");
  process.exit(1);
}

sqlAusfuehren(quizLoeschenSql(id));
console.log(`Quiz ${id} gelöscht, falls es existierte.`);
