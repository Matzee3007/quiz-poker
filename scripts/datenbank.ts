import { execFileSync } from "node:child_process";

const lokal = process.argv.includes("--lokal");

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
