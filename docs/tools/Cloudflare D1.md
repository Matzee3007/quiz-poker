---
titel: Cloudflare D1
status: aktiv
erstellt: 2026-11-05
tags: [tools, cloudflare, d1, datenbank]
---

# Cloudflare D1

SQL-Datenbank von Cloudflare auf Basis von SQLite. Sie speichert Konten und die gespeicherten Quizze (Tabelle `quiz`), siehe [[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]]. Gehört zu [[projects/quiz-poker/docs/tools/Tools Übersicht|Tools Übersicht]].

## Wichtige Begriffe

- **Binding:** Der Name, unter dem der Worker die Datenbank anspricht, hier `env.DB`.
- **Migration:** SQL-Datei, die Tabellen anlegt oder ändert. Jede läuft genau einmal, sie liegen in `migrations/`.
- **Fremdschlüssel (`REFERENCES … ON DELETE CASCADE`):** Verweis einer Zeile auf eine andere Tabelle. D1 setzt ihn durch: Wird ein Konto gelöscht, löscht die Datenbank seine Quizze mit, ohne eigenen Code.
- **`json_extract(inhalt, '$.titel')`:** Liest ein Feld aus JSON, das als Text in einer Spalte liegt. So zeigt die Liste den Titel, ohne jedes Quiz im Worker zu lesen.
- **Cron-Trigger:** Zeitplan, nach dem Cloudflare den Worker von selbst aufruft. Hier räumt er täglich alte Zeilen auf (`worker/aufraeumen.ts`).

## Wie wir es eingerichtet haben

Die Datenbank heißt `quiz-poker`, ihre Kennung steht in `wrangler.jsonc`. Tests bekommen eine eigene Datenbank im Speicher, `worker/testsetup.ts` führt dort die Migrationen aus.

## Befehle

```bash
npx wrangler d1 create quiz-poker                         # Datenbank anlegen, einmalig
npx wrangler d1 migrations apply quiz-poker --local       # Migrationen lokal ausführen, für npm run dev
npx wrangler d1 migrations apply quiz-poker --remote      # Migrationen im Betrieb ausführen, vor npm run deploy
npx wrangler d1 execute quiz-poker --local --command 'SELECT count(*) FROM "user"'   # SQL lokal ausführen
```

Die Befehle für den Betrieb stehen in [[projects/quiz-poker/docs/Betrieb|Betrieb]].

## Muster

- **Grenze in einem Befehl:** `INSERT INTO quiz (…) SELECT … WHERE (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < 20`. Zählen und Einfügen laufen zusammen, zwei gleichzeitige Anfragen kommen nicht über 20. `meta.changes` ist 0, wenn die Grenze greift.
- **Nur eigene Zeilen:** Jede Abfrage auf `quiz` enthält `besitzer = ?`. Ändert ein `UPDATE` oder `DELETE` nichts, war das Quiz fremd oder unbekannt, beides antwortet mit 404.

## Fehler

- **`no such table` bei `npm run dev`:** Die lokale Migration fehlt. Lösung: `--local` wie oben.
- **Tabellennamen `user` und `rateLimit`:** Im SQL immer in doppelten Anführungszeichen schreiben, damit Name und Schreibweise eindeutig bleiben.
