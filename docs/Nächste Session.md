---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-04
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-04. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 2 - Veröffentlichung|Lernjournal Phase 2 - Veröffentlichung]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #11)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 2 ist abgeschlossen, das Spiel läuft unter `https://quiz-poker.quiz-poker.workers.dev`.** Die nächste Session beginnt mit Phase 3 – Quiz-Sammlung. Claude fragt vorher, ob etwas anderes ansteht. Restpunkte als Vorschläge:

- Echter Spieleabend schon vor Phase 3, weil das Spiel jetzt online spielbar ist. Das Beispiel-Quiz ist kurz und selbst formuliert.
- Doppelter Code in den Ansichten: Sortierung nach Chips, `platzVon`, Grenzen 2 und 8.
- Grenzen für Beitritte und Aktionen innerhalb eines Raums. Bisher sind nur neue Räume begrenzt.
- `npm audit` meldete beim Projektstart 15 Schwachstellen in den Entwicklungswerkzeugen.
- `ubuntu-latest` wechselt laut Hinweis im CI-Lauf schrittweise auf Ubuntu 26.
- Verweis auf den Launcher anpassen: `docs/Projektvision.md` nennt ihn „im Ecosystem vorgemerkt“, seit 2026-11-04 ist er das Projekt
  `launcher` und bekommt in seiner Phase 1 eine Kachel für dieses Spiel. Die offene Frage „Wie startet das Spiel im Launcher genau?“ ist damit beantwortet: über die Web-Adresse im Standardbrowser.

Vor Phase 3 prüfen: Better Auth mit D1, E-Mail-Dienst, Cloudflare Security Audit Skill aus den Tools für später des Ecosystems, Impressum und Datenschutz.

## Passende Skills

- `grill-with-docs`: Phase 3 klären
- `plan-schreiben`: Plan für Phase 3 schreiben
