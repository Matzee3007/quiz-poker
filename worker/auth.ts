import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";

const DREISSIG_TAGE = 30 * 24 * 60 * 60;

const rechner = () => env.PASSWORTRECHNER.getByName("global");

export const auth = betterAuth({
  database: env.DB,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  telemetry: { enabled: false },
  // Die Prüfung läuft beim Start und merkt sich fehlende Tabellen je Instanz, auch nach der Migration.
  // Dass die Tabellen passen, prüft stattdessen ein Test in worker/auth.test.ts.
  advanced: { database: { validateSchema: false } },
  // Registrieren geht nur über /api/konto/registrieren, mit Einladungscode (ADR 0005).
  disabledPaths: ["/sign-up/email"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: (passwort) => rechner().hashen(passwort),
      verify: ({ hash, password }) => rechner().pruefen(hash, password),
    },
  },
  session: { expiresIn: DREISSIG_TAGE, disableSessionRefresh: true },
  user: { deleteUser: { enabled: true } },
  rateLimit: { storage: "database" },
});
