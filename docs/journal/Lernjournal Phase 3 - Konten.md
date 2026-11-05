---
titel: Lernjournal Phase 3 - Konten
status: aktiv
phase: 3
erstellt: 2026-11-05
tags: [lernjournal, phase-3, better-auth, d1, durable-objects, sicherheit]
---

# Lernjournal Phase 3: Konten

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Editor und Einmal-Quiz|Lernjournal Phase 3 - Editor und Einmal-Quiz]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Plan für Schritt 2 geschrieben: [[projects/quiz-poker/docs/plaene/2026-11-05-konten|Plan: Konten mit Einladungscode]].
- [x] Kein Impressum, kurze Datenschutzhinweise: [[projects/quiz-poker/docs/adr/0006-kein-impressum|ADR 0006]].
- [x] Passwort-Hashing im echten Betrieb gemessen (Wegwerf-Worker, danach gelöscht). Das Ergebnis war ein Grenzfall, den der Entwickler angenommen hat. Die Zahlen stehen in [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]].
- [x] Konten gebaut: Passwortrechner als Durable Object, D1 mit Better Auth, Registrieren nur mit Einladungscode, Anmelden mit Grenze je IP-Adresse, Passwort über Link, Konto löschen, Befehle für den Betreiber ([[projects/quiz-poker/docs/Betrieb|Betrieb]]).
- [x] Mock mit dem Agent `mock-bauer`, freigegeben in Variante B. Oberfläche und Datenschutzseite danach gebaut.
- [x] IP-Adressen sparsam gehalten: `/get-session` zählt nicht mit, ein täglicher Cron-Trigger löscht alte Zähler und abgelaufene Links.
- [x] Geprüft:
  - `/code-review` zweimal, mit 10 und 10 Funden, alle behoben
  - `/security-review` zweimal, ohne Fund über der Schwelle
  - Cloudflare Security Audit Skill im Profil `quick`, nur Quellcode
  - `plan-pruefer`: `STATUS: ERFÜLLT`
  - Browser-Durchlauf mit 37 Prüfungen
  - 310 Tests
- [x] PR #17 gemergt und online gestellt, Version `7d5974c5`. Echter Durchlauf mit Test-Konto: 12 von 12 Prüfungen grün, danach war die Datenbank leer.
- [ ] Schritt 3 von Phase 3 (Quizze in D1 speichern) ist noch nicht begonnen.

## Befehle: Messung und Betrieb bei Cloudflare

```bash
npx wrangler d1 create quiz-poker
npx wrangler deploy -c messung/wrangler.jsonc
npx wrangler tail --format json
npx wrangler delete --name quiz-poker-messung --force
npx wrangler d1 delete quiz-poker-messung -y
```

- `wrangler d1 create`: legt eine neue D1-Datenbank an und gibt ihre Kennung für `wrangler.jsonc` aus.
- `wrangler deploy -c <config>`: lädt einen Worker mit eigener Konfiguration hoch, hier den Mess-Worker, ohne den echten Worker zu berühren.
- `wrangler tail --format json`: zeigt jede Anfrage live mit `cpuTime` und `outcome`. Damit ließ sich die Rechenzeit je Weg messen, ohne Dashboard.
- `wrangler delete` und `wrangler d1 delete`: entfernen Wegwerf-Worker und Wegwerf-Datenbank nach der Messung.

## Befehle: Veröffentlichung der Konten

```bash
openssl rand -hex 32 | npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler d1 migrations apply quiz-poker --remote
npm run deploy
npx wrangler d1 execute quiz-poker --remote --command 'SELECT count(*) FROM "user"'
```

- `openssl rand -hex 32 | wrangler secret put`: erzeugt ein Zufallsgeheimnis und gibt es direkt an Cloudflare, ohne dass es je angezeigt wird.
- `d1 migrations apply --remote`: führt die SQL-Dateien aus `migrations/` auf der echten Datenbank aus, immer vor dem Hochladen.
- `npm run deploy`: baut und lädt hoch. In der Ausgabe stehen jetzt auch der Cron-Trigger `schedule: 17 3 * * *` und die Startzeit.
- `d1 execute --remote --command`: fragt die echte Datenbank direkt ab, hier, um zu prüfen, dass nach dem Test nichts übrig blieb.

## Befehle: Betreiber

```bash
npm run einladung
npm run passwort-link -- freund@beispiel.de
npm run einladung -- --lokal
```

- `npm run einladung`: erzeugt einen einmal gültigen Link `/registrieren?code=…`. Die Datenbank kennt nur seinen SHA-256-Hash.
- `npm run passwort-link -- <email>`: erzeugt einen Link zum Zurücksetzen, 24 Stunden und einmal gültig.
- `-- --lokal`: dasselbe auf der lokalen Datenbank von `npm run dev`.

## Neu gelernt

### Rechenzeit im kostenlosen Tarif

Ein Worker darf 10 ms rechnen, ein Durable Object 30 Sekunden. Passwort-Hashing braucht etwa 130 ms, im Worker brach Cloudflare es in 2 von 60 Fällen ab, im Durable Object nie. Der Rest der Anmeldung liegt im Worker bei etwa 7 bis 17 ms und wurde trotzdem nie abgebrochen. Die 10 ms sind also keine harte Kante.

### Better Auth auf D1

Better Auth übernimmt Sitzungen, Cookies und Anmeldegrenzen. `npx auth migrate` erreicht D1 nicht, deshalb stehen die Tabellen als SQL in `migrations/`, und ein Test prüft mit `getMigrations`, dass sie passen. Auf D1 arbeitet Better Auth ohne Transaktion, ein Konto kann also halb angelegt sein.

### Nur erlaubte Wege durchlassen

Better Auth bietet viel mehr Wege an, als das Projekt braucht, zum Beispiel Namen ändern. Statt einzelne abzuschalten, lässt `AUTH_WEGE` in `worker/index.ts` nur vier Wege durch, alles andere endet mit 404. So bleiben auch neue Wege nach einem Update zu.

### Atomares Verbrauchen

`UPDATE … WHERE benutzt_am IS NULL` ist ein einzelner Schritt. Von zwei gleichzeitigen Anfragen kann nur eine den Code verbrauchen, und nur sie darf ihn bei einem Fehler wieder freigeben. Die Freigabe gehört deshalb in den Fehlerweg jedes Schritts danach, auch in die Suche nach dem Konto.

### Cron-Trigger

Ein Zeitplan in `wrangler.jsonc`, nach dem Cloudflare den Worker von selbst aufruft (`scheduled`). Hier löscht er täglich IP-Adressen, die älter als einen Tag sind, und abgelaufene Links.

### Reviews in Runden

Der zweite `/code-review` fand Fehler in den Korrekturen des ersten. Danach fand der `plan-pruefer` noch einen dritten Fehler, und zwar in einer Korrektur der zweiten Runde. Korrekturen brauchen also selbst eine Prüfung.

## Fehler und Lösungen

### `Database schema mismatch` mit Status 500

- **Wo:** bei der Messung und im ersten Test von Better Auth
- **Ursache:** Better Auth prüft die Tabellen beim Start einer Worker-Instanz und merkt sich das Ergebnis. Startet die Instanz vor der Migration, bleibt sie bei 500.
- **Lösung:** `advanced.database.validateSchema: false`, den Abgleich übernimmt ein Test mit `getMigrations`.
- **Prüfen:** `npx vitest run worker/auth.test.ts`

### `APIError: [body.email] Invalid email address` stürzt den Worker ab

- **Wo:** Registrieren mit ungültiger Adresse
- **Ursache:** Es gibt zwei Klassen `APIError` in zwei Paketen, `instanceof` erkennt nur eine.
- **Lösung:** `isAPIError` aus `better-auth/api`
- **Prüfen:** `npx vitest run worker/konto.test.ts`

### `expected [Function] to throw error including 'Erster Fehler' but got 'D1-Aussetzer'`

- **Wo:** Freigabe der Einladung, wenn die Suche nach dem Konto scheitert
- **Ursache:** `kontoFinden` warf synchron, deshalb griff `.catch` nicht.
- **Lösung:** `kontoFinden` als `async` schreiben, dann wird ein Fehler zur abgelehnten Promise.
- **Prüfen:** `npx vitest run worker/konto.test.ts`

### Commit trotz rotem `npm run check`

- **Wo:** Commit `97e38cb` auf dem PR-Branch
- **Ursache:** Commit und Push standen im selben Befehl wie `npm run check`, aber nicht daran gekoppelt.
- **Lösung:** Danach nur noch mit `if npm run check …; then git commit …` committet. `99b6689` hat den Fehler behoben, der rote Commit bleibt in der Historie.
- **Prüfen:** `git log` zeigt nach `97e38cb` nur grüne Commits, die CI auf `39208dc` ist grün.

### Browser-Durchlauf: `waiting for getByText('E-Mail oder Passwort stimmt nicht')`

- **Wo:** zweiter Browser-Durchlauf direkt nach dem ersten
- **Ursache:** Die Anmeldegrenze griff: lokal laufen alle Versuche über `127.0.0.1`, der Zähler stand auf 10.
- **Lösung:** lokalen Zähler mit `npx wrangler d1 execute quiz-poker --local --command 'DELETE FROM "rateLimit"'` leeren
- **Prüfen:** Durchlauf meldet `ALLES OK`

## Aus dem Chat

-

## Offene Fragen

- Ob eine frei erreichbare Seite für Freunde ein Impressum braucht, bleibt ungeklärt. Der Entwickler verzichtet darauf und trägt das Risiko (ADR 0006).
- `worker/spielraum.ts:234` nimmt den WebSocket vor der Token-Prüfung an. Ob das einen Raum blockieren kann, zeigt erst der Betrieb (Audit, `needs_validation`).

## Nächste Schritte

1. Plan für Schritt 3 von Phase 3 schreiben: Quizze in D1 speichern.
2. Dort neu bewerten, ob eine laufende Anmeldung ein Zurücksetzen des Passworts überleben darf, sobald Quizze an der Sitzung hängen (Audit).
3. Prüfen, ob der Cron-Trigger in der ersten Nacht gelaufen ist (`wrangler tail` oder Dashboard).
