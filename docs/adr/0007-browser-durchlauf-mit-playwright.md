---
titel: "ADR 0007: Browser-Durchlauf mit Playwright, von Hand gestartet"
status: akzeptiert
erstellt: 2026-11-07
tags: [adr, tests, playwright]
---

# ADR (Architecture Decision Record) 0007: Browser-Durchlauf mit Playwright, von Hand gestartet

Ergänzt [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]] (Stack) um ein Werkzeug für Tests im Browser.

## Kontext

Vitest prüft Regeln und Server, aber nicht die Oberfläche. Bis Schritt 3 von Phase 3 lief ein Browser-Durchlauf mit
Playwright nur als Skript im Scratchpad und war danach verloren. Ab Schritt 4 ändern sich Startseite, Meine Quizze und
Editor erneut. Ein wiederholbarer Durchlauf im Repo soll zeigen, dass die bisherigen Wege weiter funktionieren.

## Entscheidung

- **`@playwright/test` als Entwicklungs-Abhängigkeit,** Tests in `browser/`, Befehl `npm run test:browser`.
- **Von Hand gestartet, nicht in `npm run check` und nicht in der CI:** Der Durchlauf braucht den lokalen Server, eine lokale
  D1 mit allen Migrationen und erzeugt Einladungen. Er läuft vor jedem PR, der die Oberfläche ändert.
- **Version fest auf 1.64.1 (ohne `^`):** Jede Playwright-Version gehört zu genau einer Browser-Version. 1.64.1 passt zu den
  Browsern, die schon im Cache liegen. Ein Update ist eine bewusste Aufgabe mit `npx playwright install chromium`.
- **Nur Chromium:** Für eine Freundesrunde reicht ein Browser.

## Alternativen

- **In der CI mitlaufen lassen:** Prüft jeden PR automatisch, braucht dort aber Server, lokale D1 und Browser-Download. Das
  kostet bei jedem Lauf Minuten und macht die CI langsamer und anfälliger. Lohnt sich erst, wenn die Oberfläche häufig von
  mehreren Leuten geändert wird.
- **Skript weiter im Scratchpad:** Kein neues Werkzeug im Repo, aber jedes Mal neu schreiben und nicht nachvollziehbar.
- **Alle drei Browser (Chromium, Firefox, WebKit):** Findet Unterschiede zwischen Browsern, dauert dreimal so lange. Für
  Handys (Safari) wird das in Phase 4 neu geprüft.
- **Version mit `^`:** Updates kämen von selbst, aber jedes Update verlangt neue Browser, und der Durchlauf bricht dann ab.

## Konsequenzen

- Ein Fehler in der Oberfläche fällt nur auf, wenn jemand `npm run test:browser` startet. Der Plan jedes Schritts nennt das
  deshalb als eigenen Schritt.
- Jeder Lauf eröffnet drei Spielräume und zählt gegen die lokale Grenze von 30 pro Stunde (siehe
  [[projects/quiz-poker/docs/tools/Playwright|Playwright]], „Fehler“).
- Einzelheiten zu Einrichtung und Befehlen: [[projects/quiz-poker/docs/tools/Playwright|Playwright]].
