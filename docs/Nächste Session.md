---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-07
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-07. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - AGENTS und Playwright|Lernjournal Phase 3 - AGENTS und Playwright]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #27)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 3 – Quiz-Sammlung ist abgeschlossen.** Seit 2026-11-07 sind öffentliche Quizze, Kopien und die Sammlung online
([[projects/quiz-poker/docs/plaene/2026-11-07-oeffentliche-quizze|Plan]], PR #25 und #26, Messung im Abschnitt
„Veröffentlichung“ des Plans).

**Die nächste Session beginnt mit Phase 4 – Spieleabend** (echter Test mit Freunden, Feinschliff z. B. fürs Handy,
siehe Roadmap in der Projektvision). **Claude fragt vorher, ob zuerst etwas anderes ansteht** (neue Ideen, Skills, Tools,
Restpunkte), und prüft danach `docs/Tools für später.md` für Phase 4 (bisher nur Magic Link, braucht eine eigene Domain).

Hinweise für Phase 4:

- **Handy:** `src/stil.css` setzt `body { min-width: 1100px }`, die App ist auf dem Handy heute nicht angepasst. Der Mock
  `docs/mocks/2026-11-07-sammlung.html` hat erste Regeln für schmale Bildschirme (`@media (max-width: 700px)`).
- **Browser:** Der Durchlauf prüft nur Chromium. Für Handys (Safari) ist laut
  [[projects/quiz-poker/docs/adr/0007-browser-durchlauf-mit-playwright|ADR 0007]] neu zu prüfen, ob WebKit dazukommt.
- Vor jedem PR, der die Oberfläche ändert: `npm run test:browser` (von Hand, nicht in der CI).

Im Blick behalten: Die Sitzungsabfrage braucht im Betrieb zum Teil mehr als 10 ms CPU (am 2026-11-07 bis 38 ms), bisher
ohne Abbruch (Nachmessungen in [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]). Treten
Fehler 1102 auf, zuerst `session.cookieCache` von Better Auth prüfen.

Restpunkte als Vorschläge:

- Prüfen, ob der Cron-Trigger gelaufen ist (`npx wrangler tail` oder Dashboard, Zeitplan `17 3 * * *`).
- `worker/spielraum.ts:234` nimmt den WebSocket vor der Token-Prüfung an (Audit, `needs_validation`).
- Test, dass ein Spieler vor der Auflösung keine Lösung über den WebSocket bekommt: Eine Anforderung, die man nicht
  sieht, braucht einen Test aus Sicht des Spielers (aus [[Build with AI - Auswertung]], Artikel 13, 2026-11-08). Passt
  zum Punkt davor.
- Noch nicht geprüft aus dem Audit: Größe von Anfragen an Better Auth, Verlängerung der Raumlaufzeit durch wirkungslose
  Aktionen, Gesamtzahl gespeicherter Räume.
- `anfrage-zu-gross` sagt „Das Quiz ist zu groß“, auch bei Konto-Anfragen.
- Beim Start mit `/context` unter „Memory files“ nachsehen, ob Claude Code die `AGENTS.md` mitlädt (offen seit 2026-11-07).
- Ältere Restpunkte: doppelter Code in den Ansichten, Grenzen für Beitritte in einem Raum, `npm audit`, Ubuntu 26 in der
  CI, Verweis auf den Launcher in der Projektvision, Editor in mehreren Tabs.

## Passende Skills

- `plan-schreiben`: Plan für Phase 4, sobald klar ist, was zuerst kommt
- `tdd`: Server- und Regel-Teile von Phase 4 testgetrieben bauen
- `fertig-pruefen`: vor jeder Meldung „fertig“ die Prüfbefehle frisch ausführen
