import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

const DREISSIG_TAGE = 30 * 24 * 60 * 60;

const rechner = () => env.PASSWORTRECHNER.getByName("global");

/**
 * Prüft das Passwort einer frischen Anmeldung noch einmal gegen den aktuellen Hash. Better Auth prüft das alte
 * Passwort und legt die Sitzung erst danach an. Löst dazwischen jemand einen Passwort-Link ein, überlebte die
 * Sitzung sonst das Zurücksetzen. Passt das Passwort nicht mehr, wird die Sitzung gelöscht.
 */
export async function anmeldungBestaetigen(
  umgebung: Env,
  sitzungToken: string,
  userId: string,
  passwort: string,
): Promise<boolean> {
  const konto = await umgebung.DB.prepare(
    "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
  )
    .bind(userId)
    .first<{ password: string | null }>();
  if (konto?.password && (await rechner().pruefen(konto.password, passwort))) {
    return true;
  }
  await umgebung.DB.prepare("DELETE FROM session WHERE token = ?")
    .bind(sitzungToken)
    .run();
  return false;
}

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
      // Vor dem Löschen: Scheitert das, bleibt das Konto bestehen, statt dass der Link überlebt.
      beforeDelete: async (konto) => {
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
    after: createAuthMiddleware(async (ctx) => {
      const neu = ctx.context.newSession;
      if (ctx.path !== "/sign-in/email" || !neu) {
        return;
      }
      const passwort = (ctx.body as { password: string }).password;
      if (
        !(await anmeldungBestaetigen(
          env,
          neu.session.token,
          neu.user.id,
          passwort,
        ))
      ) {
        // Dieselbe Antwort wie bei einem falschen Passwort.
        throw new APIError("UNAUTHORIZED", {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
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
      // Das Passwort ist hier die einzige Hürde, also dieselbe Grenze wie beim Anmelden.
      "/delete-user": { window: 60, max: 10 },
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
