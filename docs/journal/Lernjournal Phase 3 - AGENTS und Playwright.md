---
titel: Lernjournal Phase 3 - AGENTS und Playwright
status: aktiv
phase: 3
erstellt: 2026-11-07
tags: [lernjournal, phase-3, codex, playwright, claude-code]
---

# Lernjournal Phase 3: AGENTS und Playwright

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Quizze speichern|Lernjournal Phase 3 - Quizze speichern]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] `AGENTS.md` ist nur noch ein Verweis auf die `CLAUDE.md` (PR #23), weil Codex als zweites Werkzeug dient, wenn die Tokens von Claude aufgebraucht sind
- [x] Entschieden: Playwright kommt als erste Aufgabe in den Plan für Schritt 4, als eigener Befehl `npm run test:browser`, vorerst nicht in `npm run check` und nicht in der CI
- [x] Ecosystem: Punkt „`AGENTS.md` der Projekte als Verweis“ in dessen Übergabe (PR #155)
- [x] Ecosystem: neue Regel „Immer auf Deutsch antworten“ in der globalen `CLAUDE.md` (PR #157)

## Befehle: Arbeiten in einem anderen Repo

```bash
cd ~/claude-ecosystem && git branch --show-current && git status --short
gh pr list --state open --head config/kontext-schlanker
git add config/CLAUDE.md
```

- `git branch --show-current` und `git status --short`: zeigen vor jeder Änderung in einem fremden Repo, ob dort gerade gearbeitet wird. Hier stand das Ecosystem zuerst auf einem anderen Branch mit offenem PR #153, deshalb wartete der Eintrag, bis der Entwickler dort fertig war.
- `gh pr list --head <branch>`: zeigt den offenen PR zu einem Branch.
- `git add <datei>`: nur die eigene Datei committen. Die drei ungespeicherten Dateien des Entwicklers im Ecosystem blieben so unberührt.

## Neu gelernt

### Verweis statt Kopie

Die alte `AGENTS.md` war eine Kopie der `CLAUDE.md` mit „Codex“ statt „Claude“ und fehlte schon die Änderungen eines Tages. Eine Datei, die nur auf die andere verweist, kann nicht veralten. Laut Übergabe des Ecosystems lädt Claude Code `AGENTS.md`-Dateien zusätzlich als Memory, die Kopie kostete also auch Tokens.

### Eine Regel, eine Stelle

Die Erinnerung „auf Deutsch antworten“ lag zuerst nur im Memory dieses Projekts. Mit der Zeile in der globalen `CLAUDE.md` gilt sie überall, das Memory wurde wieder gelöscht, damit die Regel nicht doppelt steht.

## Fehler und Lösungen

### Antworten auf Englisch

- **Wo:** zwei Abschlussberichte am 2026-11-06 und 2026-11-07, jeweils nach vielen Tool-Aufrufen und englischen Berichten von Subagents
- **Ursache:** Keine Regel verlangte ausdrücklich Deutsch, die englischen Ausgaben zogen die Sprache mit.
- **Lösung:** Zeile im Antwortstil der globalen `CLAUDE.md` (PR #157 im Ecosystem). Eigennamen und üblicherweise englische Begriffe (Skill, Tool, Hook, Pull Request) bleiben englisch.
- **Prüfen:** in der nächsten Session, die die neue `CLAUDE.md` beim Start lädt

### `/code-review` fand PR #157 nicht

- **Wo:** `/code-review low 157` aus der quiz-poker-Session
- **Ursache:** Die Prüfung sucht im Repo des aktuellen Ordners. PR #157 liegt im Ecosystem.
- **Lösung:** die volle Adresse übergeben (`https://github.com/Matzee3007/claude-ecosystem/pull/157`). Dieser Lauf endete ohne Ausgabe, die zwei Zeilen wurden deshalb von Hand geprüft.
- **Prüfen:** -

## Aus dem Chat

-

## Offene Fragen

- Lädt Claude Code die neue `AGENTS.md` von quiz-poker mit? Beim nächsten Start mit `/context` unter „Memory files“ nachsehen.

## Nächste Schritte

1. Plan für Schritt 4 schreiben, erste Aufgabe: Browser-Durchlauf mit Playwright ins Repo.
