import { DurableObject } from "cloudflare:workers";
import { hashPassword, verifyPassword } from "better-auth/crypto";

/** Hashing braucht rund 130 ms CPU. Ein Worker darf nur 10 ms, ein Durable Object 30 Sekunden (ADR 0005). */
export class Passwortrechner extends DurableObject<Env> {
  hashen(passwort: string): Promise<string> {
    return hashPassword(passwort);
  }

  pruefen(hash: string, passwort: string): Promise<boolean> {
    return verifyPassword({ hash, password: passwort });
  }
}
