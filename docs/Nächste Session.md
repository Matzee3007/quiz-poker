---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-03
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-03. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 0 - Projektvision und CI|Lernjournal Phase 0 - Projektvision und CI]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #4)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 0 ist abgeschlossen, als Nächstes kommt Phase 1 – Regelkern.**

1. Claude fragt zuerst, ob etwas anderes ansteht (neue Ideen, Skills, Tools, Restpunkte). Mögliche Restpunkte:
   - `npm audit` meldete beim Projektstart 15 Schwachstellen in den Entwicklungswerkzeugen (noch nicht behoben).
   - `ubuntu-latest` wechselt laut Hinweis im CI-Lauf schrittweise auf Ubuntu 26, CI im Blick behalten.
2. `docs/Tools für später.md` prüfen: Für Phase 1 ist nichts vorgemerkt.
3. Mit `plan-schreiben` den Plan für Phase 1 schreiben. Die Regeln stehen in der Projektvision unter „Spielregeln“, der Code
   entsteht als reines TypeScript in `src/regeln/`.
4. Mit `tdd` umsetzen, Test für Test.

## Passende Skills

- `plan-schreiben`: Plan für Phase 1 aus den Spielregeln
- `tdd`: Regelkern testgetrieben bauen
- `fertig-pruefen`: vor jeder Fertigmeldung
