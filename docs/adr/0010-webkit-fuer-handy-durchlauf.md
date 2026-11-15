---
titel: "ADR 0010: WebKit für den Handy-Durchlauf"
status: akzeptiert
erstellt: 2026-11-12
tags: [adr, tests, playwright, handy]
---

# ADR (Architecture Decision Record) 0010: WebKit für den Handy-Durchlauf

Ergänzt [[projects/quiz-poker/docs/adr/0007-browser-durchlauf-mit-playwright|ADR 0007]], das „Nur Chromium“ für Phase 4
offen ließ.

## Kontext

In Phase 4 spielen Spieler am Handy mit
([[projects/quiz-poker/docs/plaene/2026-11-09-handy-layout|Plan Handy-Layout]]). Auf dem iPhone läuft jeder Browser mit
WebKit, dem Kern von Safari. Unterschiede zu Chromium zeigen sich gerade bei dem, was das Handy-Layout braucht: klebende
Leisten (`position: sticky`), Schieberegler und Schriftgrößen in Eingabefeldern. Ein Versuch am 2026-11-12 zeigte, dass
WebKit mit dem lokalen Vite-Server und den WebSockets der Spielräume läuft.

## Entscheidung

- **Zweites Playwright-Projekt `handy`:** WebKit mit `devices["iPhone 13 Mini"]` (375 × 629 px, Touch), nur für
  `browser/handy.spec.ts`. Das Projekt `chromium` ignoriert diese Datei, der bisherige Durchlauf bleibt unverändert.
- In einem Test sitzt der Quiz-Master in einem eigenen Kontext mit 1280 px Breite, die Spieler in Kontexten mit
  Handy-Einstellungen. Jeder Test schließt seine Kontexte, weil offene WebSockets die folgenden Tests bremsen.
- Das Maß für „passt aufs Handy“ ist: `scrollWidth` der Seite ist nicht größer als die Bildschirmbreite.

## Alternativen

- **Alle Tests in drei Browsern:** Findet mehr Unterschiede, dauert aber dreimal so lange. Konto, Editor und Sammlung
  nutzt der Quiz-Master am Laptop.
- **Nur die Breite in Chromium (`viewport: 375`):** Kein zweiter Browser im Cache, aber Safari-Eigenheiten fallen nicht auf.
- **Gar kein Handy-Test, nur Abnahme am echten Gerät:** Am genauesten, aber nicht wiederholbar. Die Abnahme bleibt
  zusätzlich (Tastatur, echtes Safari).

## Konsequenzen

- Der Browser-Cache braucht zusätzlich WebKit in der Version zu Playwright 1.64.1 (`npx playwright install webkit`,
  Ordner `webkit-2370`).
- Ein Lauf eröffnet jetzt acht Spielräume. Lokal ist dafür `RAEUME_PRO_STUNDE=1000` in `.dev.vars` nötig (siehe
  [[projects/quiz-poker/docs/tools/Playwright|Playwright]], „Fehler“).
- Der Durchlauf dauert länger: Die drei Handy-Tests brauchen in WebKit zusammen etwa 30 Sekunden.
- Die offene Tastatur von iOS kann Playwright nicht nachbauen. Sie wird nur bei der Abnahme am echten Gerät geprüft.
