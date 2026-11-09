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
- **Spalte nachträglich:** `ALTER TABLE quiz ADD COLUMN oeffentlich_seit INTEGER` (Migration 0003). Vorhandene Zeilen bekommen `NULL`, also privat. Eine Spalte mit `NOT NULL` bräuchte einen Standardwert.
- **Teilindex:** `CREATE INDEX … ON quiz (oeffentlich_seit, id) WHERE oeffentlich_seit IS NOT NULL` enthält nur öffentliche Quizze. Er bleibt klein und passt genau zur Abfrage der Sammlung.
- **Blättern mit Zeiger (Keyset Pagination):** Statt `OFFSET` merkt sich die nächste Seite den letzten Eintrag: `WHERE oeffentlich_seit < ? OR (oeffentlich_seit = ? AND id < ?) ORDER BY oeffentlich_seit DESC, id DESC LIMIT 21`. Die `id` entscheidet bei gleichem Zeitpunkt. Ein neu veröffentlichtes Quiz verschiebt die nächste Seite nicht, und der 21. Treffer zeigt nur, dass es weitergeht.
- **Kopie in einem Befehl:** `INSERT INTO quiz (…) SELECT ?, ?, inhalt, spielbar, ? FROM quiz WHERE id = ? AND oeffentlich_seit IS NOT NULL AND (SELECT COUNT(*) …) < 20`. Ist `meta.changes` 0, unterscheidet ein zweites `SELECT` zwischen 404 und 409.
- **`COALESCE(a, b)`:** liefert `a`, wenn es nicht `NULL` ist, sonst `b`. Beim Veröffentlichen behält ein schon öffentliches Quiz so seinen Zeitpunkt.
- **Nur eigene Zeilen:** Jede Abfrage auf `quiz` enthält `besitzer = ?`. Ändert ein `UPDATE` oder `DELETE` nichts, war das Quiz fremd oder unbekannt, beides antwortet mit 404.

## Fehler

- **`no such table` bei `npm run dev`:** Die lokale Migration fehlt. Lösung: `--local` wie oben.
- **`The given account is not valid or is not authorized to access this service [code: 7403]`** bei
  `wrangler d1 execute --remote` (2026-11-08): Konto und Recht `d1 (write)` stimmten laut `npx wrangler whoami`. Ursache
  nicht geklärt, vermutlich hat sich die OAuth-Anmeldung im Hintergrund erneuert. Lösung: Befehl wiederholen.
- **Time Travel:** D1 hält frühere Stände im kostenlosen Tarif 7 Tage, das lässt sich nicht abschalten. Gelöschte Daten
  bleiben dort so lange, siehe [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen|ADR 0009]].
- **Tabellennamen `user` und `rateLimit`:** Im SQL immer in doppelten Anführungszeichen schreiben, damit Name und Schreibweise eindeutig bleiben.
