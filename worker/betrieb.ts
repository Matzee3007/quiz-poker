// SQL für die Befehle des Betreibers. wrangler d1 execute kennt keine Platzhalter, deshalb stehen die Werte im Text.
// Wird auch von scripts/ unter Node geladen, darf also nichts von Cloudflare importieren.

const LINK_GUELTIG = 24 * 60 * 60 * 1000;

function sqlText(text: string): string {
  return `'${text.replaceAll("'", "''")}'`;
}

export function einladungSql(codeHash: string): string {
  return `INSERT INTO einladung (code_hash) VALUES (${sqlText(codeHash)})`;
}

export function linkGueltigBis(jetzt: number): number {
  return jetzt + LINK_GUELTIG;
}

/** Better Auth speichert Adressen kleingeschrieben, der Link muss sie genauso nennen. */
export function passwortLinkSql(
  tokenHash: string,
  email: string,
  gueltigBis: number,
): string {
  return `INSERT INTO passwort_link (token_hash, email, gueltig_bis) VALUES (${sqlText(tokenHash)}, ${sqlText(email.toLowerCase())}, ${gueltigBis})`;
}

/** Form einer Quiz-ID (crypto.randomUUID), gilt im Worker und im Befehl des Betreibers. */
export const QUIZ_ID_MUSTER = /^[0-9a-f-]{36}$/;

export function quizLoeschenSql(id: string): string {
  return `DELETE FROM quiz WHERE id = ${sqlText(id)}`;
}
