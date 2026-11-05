const EIN_TAG = 24 * 60 * 60 * 1000;

/** Läuft täglich: IP-Adressen und E-Mail-Adressen sollen nicht länger bleiben, als sie gebraucht werden. */
export async function aufraeumen(env: Env, jetzt: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM "rateLimit" WHERE lastRequest < ?').bind(
      jetzt - EIN_TAG,
    ),
    env.DB.prepare("DELETE FROM passwort_link WHERE gueltig_bis < ?").bind(
      jetzt,
    ),
  ]);
}
