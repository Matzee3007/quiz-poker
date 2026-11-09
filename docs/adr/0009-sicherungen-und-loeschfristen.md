---
titel: "ADR 0009: Sicherungen von Cloudflare und Löschfristen"
status: akzeptiert
erstellt: 2026-11-09
tags: [adr, datenschutz, betrieb, d1, durable-objects]
---

# ADR (Architecture Decision Record) 0009: Sicherungen von Cloudflare und Löschfristen

Ergänzt [[projects/quiz-poker/docs/adr/0006-kein-impressum|ADR 0006]] (kurze Datenschutzhinweise).

## Kontext

Die Datenschutzseite (`src/ansichten/Datenschutz.svelte`) versprach, dass IP-Adressen „nach etwa einem Tag automatisch
gelöscht“ werden und Konten und Quizze beim Löschen „sofort entfernt“ sind. Laut Doku von Cloudflare (geprüft am
2026-11-09) hält Cloudflare aber eigene Sicherungen:

- **D1 Time Travel** (Konten, Sitzungen, Quizze, IP-Adressen in `rateLimit`): „always on“, im kostenlosen Tarif 7 Tage,
  im bezahlten 30. Abschalten oder Verkürzen ist nicht vorgesehen.
- **Point-in-Time-Recovery von Durable Objects mit SQLite** (Spielräume): frühere Stände der letzten 30 Tage. Ob das im
  kostenlosen Tarif gilt und ob `deleteAll()` auch die Sicherungen leert, sagt die Doku nicht.

Gelöschte Daten lassen sich also noch bis zu 7 bzw. 30 Tage zurückholen, wenn auch nur, indem man die ganze Datenbank oder
den ganzen Raum zurücksetzt. Aufgefallen ist das bei der Auswertung der Artikelserie „Engineering for Vibe Coders“
(Artikel 111).

Dazu kam die Frage, wie auffällt, dass der tägliche Lösch-Lauf (`worker/aufraeumen.ts`, Cron `17 3 * * *`) ausfällt.
Dann blieben IP-Adressen unbemerkt länger gespeichert.

## Entscheidung

- **Die Datenschutzseite nennt die Fristen ehrlich**, in einem eigenen Abschnitt „Sicherungen“: Datenbank bis zu 7 Tage,
  Spielräume bis zu 30 Tage. Dazu kommt die Zusage, dass der Betreiber die Sicherungen nur nutzt, um einen Datenverlust zu
  beheben. Für die Spielräume nennen wir vorsichtig die 30 Tage, solange die Doku offen lässt, ob sie im kostenlosen Tarif gelten.
- **Eine GitHub Action prüft den Lösch-Lauf täglich** (`.github/workflows/cron-pruefen.yml`, 5 Uhr UTC). Sie fragt die
  Analytics von Cloudflare nach dem neuesten Aufruf mit `eventType: "cron"` in den letzten 24 Stunden. Fehlt er oder war
  er nicht erfolgreich, schlägt der Workflow fehl, und GitHub schickt eine E-Mail. Die Logik steht getestet in `worker/cronpruefung.ts`, der
  Befehl in `scripts/cron-pruefen.ts`.

## Alternativen

- **Nur den Satz zu IP-Adressen ergänzen:** Konten, Quizze und Spielräume blieben bei „sofort entfernt“, und das wäre
  weiter ungenau.
- **Fristen ohne Zusage nennen:** Das ist ehrlich, lässt aber offen, wofür der Betreiber die Sicherungen nutzen darf.
- **Zeitstempel in D1 und `npm run betrieb-status`:** Das ist einfach, warnt aber nur, wenn jemand den Befehl ausführt.
- **Zeitstempel und GitHub Action zusammen:** Das ist am genauesten, braucht aber Code im Worker. Die Analytics belegen
  den Lauf schon ohne Code im Worker.

## Konsequenzen

- Die GitHub Action braucht zwei Secrets: `CLOUDFLARE_ANALYTICS_TOKEN` (API-Token, nur „Account Analytics: Read“) und
  `CLOUDFLARE_ACCOUNT_ID`.
- GitHub pausiert geplante Workflows nach 60 Tagen ohne Aktivität nur in öffentlichen Repos (Doku, geprüft 2026-11-09).
  Würde das Repo öffentlich, könnte die Prüfung bei Ruhe im Projekt ausfallen.
- Die IP-Adressen bleiben im Betrieb bis zu etwa 48 Stunden: Der Lauf ist täglich und löscht nur Einträge, die älter als
  24 Stunden sind. Die Datenschutzseite sagt deshalb „nach ein bis zwei Tagen“.
- Ein Lauf mit `status: success` heißt nur, dass `aufraeumen` keinen Fehler geworfen hat. Wie viele Zeilen gelöscht
  wurden, zeigen die Analytics nicht.
- Wechselt das Projekt in den bezahlten Tarif, steigt die Frist von D1 auf 30 Tage. Dann muss die Datenschutzseite
  angepasst werden.
