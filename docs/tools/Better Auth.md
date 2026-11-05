---
titel: Better Auth
status: aktiv
erstellt: 2026-11-05
tags: [tools, better-auth, konten]
---

# Better Auth

Bibliothek für Login mit E-Mail und Passwort. Sie übernimmt Anmelden, Sitzungen, Cookies und Konto löschen, damit die heikle Passwort-Sicherheit nicht selbst gebaut werden muss. Version 1.7.17, MIT. Gehört zu [[projects/quiz-poker/docs/tools/Tools Übersicht|Tools Übersicht]].

## Wofür wir es nutzen

- `worker/auth.ts` richtet es ein, `/api/auth/*` führt direkt dorthin.
- Das Hashing läuft im Durable Object `Passwortrechner`, siehe [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]].
- Registrieren (`/api/konto/registrieren`) und Passwort neu setzen (`/api/konto/passwort-neu`) sind eigene Wege in `worker/konto.ts`, weil es keine E-Mails gibt.

## Wichtige Begriffe

- **Sitzung:** Der Server merkt sich, dass ein Browser angemeldet ist. Der Browser trägt dafür ein Cookie.
- **Hash:** Aus einem Passwort berechneter Wert, aus dem sich das Passwort nicht zurückrechnen lässt. Better Auth nutzt scrypt, das absichtlich viel Rechenzeit braucht.
- **Rate Limit:** Grenze, wie oft jemand etwas in einer Zeitspanne tun darf.

## Wie wir es eingerichtet haben

```bash
npm install --save-exact better-auth@1.7.17   # genaue Version, Updates bewusst prüfen
```

- `disabledPaths: ["/sign-up/email"]` schaltet die offene Registrierung ab. `auth.api.signUpEmail` geht weiter.
- `rateLimit` mit `storage: "database"`, sonst zählt jede Worker-Instanz für sich. Als IP-Adresse gilt nur `cf-connecting-ip`.
- `/get-session` zählt nicht mit, sonst bliebe von jedem Besucher der Startseite die IP-Adresse in D1.
- Ein Hook leert `ipAddress` und `userAgent` jeder Sitzung.
- `npx auth migrate` kann D1 nicht erreichen. Die Tabellen stehen in `migrations/0001_konten.sql`, ein Test prüft mit `getMigrations`, dass sie passen. Nach einem Update zeigt dieser Test, ob sich etwas geändert hat.

## Fehler

- **`Database schema mismatch` mit 500, obwohl die Tabellen da sind:** Better Auth prüft die Tabellen beim Start einer Worker-Instanz und merkt sich das Ergebnis. Lösung: `advanced.database.validateSchema: false`, den Abgleich macht der Test.
- **Ungültige E-Mail bringt den Worker zum Absturz:** Es gibt zwei Klassen `APIError` in zwei Paketen, `instanceof` erkennt nur eine. Lösung: `isAPIError` aus `better-auth/api`.
- **Rechenzeit:** Der Worker-Teil einer Anmeldung liegt teils über den 10 ms des kostenlosen Tarifs. Zahlen und Entscheidung stehen in ADR 0005.
