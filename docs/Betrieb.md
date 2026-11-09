---
titel: Betrieb
status: aktiv
erstellt: 2026-11-05
tags: [betrieb, konten]
---

# Betrieb

Befehle für den Betreiber, eine Admin-Seite gibt es nicht ([[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]). Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

Alle Befehle wirken auf die echte Datenbank, mit `-- --lokal` auf die lokale. Sie brauchen `npx wrangler login`.

## Jemanden einladen

```bash
npm run einladung        # gibt einen Link /registrieren?code=… aus, gültig bis zur Nutzung
```

Den Link selbst weiterschicken. Die Datenbank kennt nur seinen Hash, er lässt sich später nicht mehr anzeigen.

## Vergessenes Passwort

```bash
npm run passwort-link -- freund@beispiel.de    # gibt einen Link /passwort-neu?token=… aus, 24 Stunden und einmal gültig
```

Einen Tippfehler in der Adresse meldet der Befehl nicht. Der Link wird dann beim Benutzen abgelehnt.

## Quiz löschen

```bash
npm run quiz-loeschen -- 3f2b…-…    # löscht das Quiz mit dieser ID, egal welchem Konto es gehört
```

Die IDs der Quizze eines Kontos zeigt diese Abfrage:

```bash
npx wrangler d1 execute quiz-poker --remote --command "SELECT id, json_extract(inhalt, '$.titel') AS titel FROM quiz WHERE besitzer = (SELECT id FROM \"user\" WHERE email = 'freund@beispiel.de')"
```

Alle öffentlichen Quizze mit Titel und Besitzer, die neuesten zuerst:

```bash
npx wrangler d1 execute quiz-poker --remote --command "SELECT quiz.id, json_extract(inhalt, '$.titel') AS titel, \"user\".email FROM quiz JOIN \"user\" ON \"user\".id = quiz.besitzer WHERE oeffentlich_seit IS NOT NULL ORDER BY oeffentlich_seit DESC"
```

`npm run quiz-loeschen` gilt auch für öffentliche Quizze: Sie verschwinden sofort aus der Sammlung. Kopien, die andere schon
übernommen haben, bleiben, sie haben eine eigene ID und gehören deren Konto.

Gelöschte Quizze lassen sich nicht wiederherstellen. Laufende Spielräume spielen mit ihrer Kopie weiter.

## Täglichen Lauf prüfen

Der Worker löscht jeden Tag um 3:17 Uhr UTC alte IP-Adressen und abgelaufene Links. Ob das geklappt hat, prüft die GitHub
Action `cron-pruefen.yml` jeden Morgen und schickt bei einem Fehler eine E-Mail. Von Hand:

```bash
CLOUDFLARE_ANALYTICS_TOKEN=$(cat ~/.cloudflare-analytics-token) CLOUDFLARE_ACCOUNT_ID=<id aus npx wrangler whoami> npm run cron-pruefen
```

Kommt die E-Mail, zuerst mit `npx wrangler deployments list` nachsehen, ob ein Deploy den Zeitplan verändert hat, und mit
`npx wrangler tail` den nächsten Lauf beobachten. Hintergrund: [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen|ADR 0009]].

## Vertippte Optionen

Alle Befehle brechen bei einer unbekannten Option ab, bevor sie etwas ausführen, zum Beispiel bei `--local` statt `--lokal`. Sonst liefen sie still gegen die echte Datenbank.

## Datenbank ändern

```bash
npx wrangler d1 migrations apply quiz-poker --remote    # neue Dateien aus migrations/ ausführen, immer vor npm run deploy
```

Zuerst die Migration, dann hochladen. Sonst läuft neuer Code gegen alte Tabellen.

## Geheimnis setzen oder wechseln

```bash
npx wrangler secret put BETTER_AUTH_SECRET    # fragt den Wert ab, erzeugen mit: openssl rand -hex 32
```

Das Geheimnis schützt die Sitzungen und die im Browser gespeicherten Cookies. Ist es bekannt geworden, sofort wechseln. Danach müssen sich alle neu anmelden, Konten und Passwörter bleiben erhalten.
