import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

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
  user: {
    deleteUser: {
      enabled: true,
      // Ein alter Link darf nicht das Passwort eines neuen Kontos mit derselben Adresse setzen.
      afterDelete: async (konto) => {
        await env.DB.prepare("DELETE FROM passwort_link WHERE email = ?")
          .bind(konto.email)
          .run();
      },
    },
  },
  hooks: {
    // Better Auth prüft das Passwort nur, wenn eines mitkommt. Löschen ist endgültig, also immer verlangen.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/delete-user" && !ctx.body?.password) {
        throw new APIError("BAD_REQUEST", {
          code: "PASSWORD_REQUIRED",
          message: "Password required",
        });
      }
    }),
  },
  rateLimit: {
    enabled: true,
    // Im Speicher des Workers zählt jede Instanz für sich, deshalb in D1.
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      // Die Startseite fragt das bei jedem Besuch ab. So bleibt von Gästen keine IP-Adresse in D1.
      "/get-session": false,
    },
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
