import { execFileSync } from "node:child_process";

const lokal = process.argv.includes("--lokal");

// Ein vertipptes --local liefe sonst still gegen die echte Datenbank.
const unbekannt = process.argv
  .slice(2)
  .filter((wert) => wert.startsWith("-") && wert !== "--lokal");
if (unbekannt.length > 0) {
  console.error(
    `Unbekannte Option: ${unbekannt.join(" ")}. Erlaubt ist nur --lokal.`,
  );
  process.exit(1);
}

export const ADRESSE = lokal
  ? "http://localhost:5173"
  : "https://quiz-poker.quiz-poker.workers.dev";

/** Führt SQL auf der echten Datenbank aus, mit --lokal auf der lokalen. */
export function sqlAusfuehren(sql: string): void {
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "quiz-poker",
      lokal ? "--local" : "--remote",
      "--command",
      sql,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}
