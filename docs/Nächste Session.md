---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-04
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-04. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Editor und Einmal-Quiz|Lernjournal Phase 3 - Editor und Einmal-Quiz]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #16)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 3 – Quiz-Sammlung läuft, Schritt 1 ist online:** Unter `https://quiz-poker.quiz-poker.workers.dev` lässt sich ohne Konto ein Einmal-Quiz erstellen und spielen ([[projects/quiz-poker/docs/plaene/2026-11-04-einmal-quiz|Plan]], PR #15). Die Regeln für Phase 3 stehen in der Projektvision und in [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]], sie müssen nicht neu geklärt werden.

**Nächster Schritt: Plan für Schritt 2 (Konten mit Einladungscode) schreiben.** Die erste Aufgabe darin ist ein Test im echten Betrieb bei Cloudflare: Passwort-Hashing im Durable Object und die Größe des Workers mit Better Auth. Scheitert er, wird die Hashing-Zeile in ADR 0005 neu entschieden. Vor der Veröffentlichung der Konten: Impressum und Datenschutzhinweise online, Cloudflare Security Audit Skill einmal ausführen. Jeder PR ab den Konten bekommt zusätzlich `/security-review`.

Restpunkte als Vorschläge:

- Echter Spieleabend mit eigenen Fragen, das geht seit Schritt 1.
- Browser-Tests ins Repo holen: Die Prüfungen von Schritt 1 liefen mit Skripten außerhalb des Repos (Playwright mit dem installierten Chrome) und lassen sich nicht wiederholen. Für die Konten lohnen sich feste Tests. Das wäre eine neue Abhängigkeit, also vorher fragen.
- Offene Review-Punkte aus PR #15 stehen im Plan unter „Ergebnis des Reviews“, zum Beispiel der Editor in mehreren Tabs.
- Ein Quiz an allen Grenzen auf der echten Seite spielen: Online lief bisher nur ein kleines Quiz, die Grenze von 10 ms ist dafür nicht gemessen.
- Doppelter Code in den Ansichten: Sortierung nach Chips, `platzVon`, Grenzen 2 und 8.
- Grenzen für Beitritte und Aktionen innerhalb eines Raums. Bisher sind nur neue Räume begrenzt.
- `npm audit` meldete beim Projektstart 15 Schwachstellen in den Entwicklungswerkzeugen.
- `ubuntu-latest` wechselt laut Hinweis im CI-Lauf schrittweise auf Ubuntu 26.
- Verweis auf den Launcher anpassen: `docs/Projektvision.md` nennt ihn „im Ecosystem vorgemerkt“, seit 2026-11-04 ist er das Projekt
  `launcher` und bekommt in seiner Phase 1 eine Kachel für dieses Spiel. Die offene Frage „Wie startet das Spiel im Launcher genau?“ ist damit beantwortet: über die Web-Adresse im Standardbrowser.

## Passende Skills

- `plan-schreiben`: Plan für Schritt 2 schreiben
- `tdd`: Konten und Einladungscodes testgetrieben bauen
