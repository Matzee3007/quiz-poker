---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-05
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-05. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Konten|Lernjournal Phase 3 - Konten]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #19)
- **Offene PRs:** keine
- **Nicht committet:** `AGENTS.md`. Die Datei stammt nicht aus dieser Session und wurde weder gelesen noch committet.

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

2. Klären, was `AGENTS.md` ist und ob die Datei ins Repo gehört.

## Womit es weitergeht

**Phase 3 – Quiz-Sammlung läuft, Schritt 2 ist online:** Konten mit Einladungscode sind seit 2026-11-05 unter `https://quiz-poker.quiz-poker.workers.dev` veröffentlicht ([[projects/quiz-poker/docs/plaene/2026-11-05-konten|Plan]], PR #17). Einladungen und Passwort-Links erzeugt der Betreiber per Befehl, siehe [[projects/quiz-poker/docs/Betrieb|Betrieb]].

**Nächster Schritt: Plan für Schritt 3 schreiben, Quizze in D1 speichern.** Die Regeln stehen in der Projektvision, Abschnitt „Quiz-Sammlung“. Mit Schritt 3 kommen auch das Löschen der Quizze eines Kontos und der Betreiber-Befehl zum Löschen eines Quiz. Ab jetzt bekommt jeder PR zusätzlich `/security-review`.

Bei Schritt 3 beachten:

- Neu bewerten, ob eine laufende Anmeldung ein Zurücksetzen des Passworts überleben darf, sobald Quizze an der Sitzung hängen. Das ist ein verworfener Fund aus dem Audit (`~/security-audit-skill/quiz-poker/run-1/REPORT.md`).
- Der Datenschutztext in `src/ansichten/Datenschutz.svelte` muss die gespeicherten Quizze nennen.

Restpunkte als Vorschläge:

- Prüfen, ob der Cron-Trigger in der ersten Nacht gelaufen ist (`npx wrangler tail` oder Dashboard, Zeitplan `17 3 * * *`).
- `worker/spielraum.ts:234` nimmt den WebSocket vor der Token-Prüfung an. Der Audit führt das als `needs_validation`.
- Noch nicht geprüft aus dem Audit: Größe von Anfragen an Better Auth, Verlängerung der Raumlaufzeit durch wirkungslose Aktionen, Gesamtzahl gespeicherter Räume. Blockiert waren Clickjacking, bekannte Schwachstellen und `cf-connecting-ip`.
- Browser-Tests ins Repo holen: Die Durchläufe dieser Session lagen im Scratchpad und lassen sich nicht wiederholen. Das wäre eine neue Abhängigkeit, also vorher fragen.
- `anfrage-zu-gross` sagt „Das Quiz ist zu groß“, auch bei Konto-Anfragen.
- Ältere Restpunkte aus der vorigen Übergabe stehen weiter offen:
  - doppelter Code in den Ansichten
  - Grenzen für Beitritte in einem Raum
  - `npm audit`
  - Ubuntu 26 in der CI
  - Verweis auf den Launcher in der Projektvision
  - Editor in mehreren Tabs

## Passende Skills

- `plan-schreiben`: Plan für Schritt 3 schreiben
- `tdd`: Speichern in D1 testgetrieben bauen
