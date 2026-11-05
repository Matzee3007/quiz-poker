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
  advanced: {
    database: { validateSchema: false },
    // Diesen Header setzt Cloudflare selbst, ein Angreifer kann ihn nicht fälschen.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
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
  rateLimit: {
    enabled: true,
    // Im Speicher des Workers zählt jede Instanz für sich, deshalb in D1.
    storage: "database",
    customRules: { "/sign-in/email": { window: 60, max: 10 } },
  },
  databaseHooks: {
    session: {
      create: {
        // Außer E-Mail und Passwort-Hash werden keine persönlichen Daten gespeichert (ADR 0003).
        before: async (sitzung) => ({
          data: { ...sitzung, ipAddress: null, userAgent: null },
        }),
      },
    },
  },
});
