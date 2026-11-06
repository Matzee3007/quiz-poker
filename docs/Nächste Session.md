---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-06
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-06. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Quizze speichern|Lernjournal Phase 3 - Quizze speichern]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #22)
- **Offene PRs:** keine
- **Nicht committet:** `AGENTS.md` (Kopie der `CLAUDE.md` für Codex, siehe unten)

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 3 – Quiz-Sammlung läuft, Schritt 3 ist online:** Gespeicherte Quizze sind seit 2026-11-06 veröffentlicht ([[projects/quiz-poker/docs/plaene/2026-11-06-quizze-speichern|Plan]], PR #21).

**Nächster Schritt: Plan für Schritt 4 schreiben**, öffentliche Quizze, Kopien und Schutzregeln (Projektvision, Abschnitt „Quiz-Sammlung“). Dazu gehören:

- das Beispiel-Quiz als Vorlage kopieren (bewusst aus Schritt 3 verschoben)
- neu bewerten, ob „Spielen“ das Quiz über seine ID statt über den Inhalt eröffnet (Review-Fund 9 im Plan von Schritt 3). Bei öffentlichen Quizzen muss der Server den Inhalt ohnehin selbst lesen.
- jeder PR bekommt weiter `/code-review` und `/security-review`

Vorher entscheiden:

- `AGENTS.md`: ins Repo, löschen oder liegen lassen? Sie ist gegenüber der `CLAUDE.md` schon veraltet.
- Browser-Durchlauf mit Playwright ins Repo holen? Er lag diese Session wieder nur im Scratchpad. Das wäre eine neue Abhängigkeit.

Im Blick behalten: Die Sitzungsabfrage braucht im Betrieb zum Teil mehr als 10 ms CPU, bisher ohne Abbruch (Nachmessung in [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]). Treten Fehler 1102 auf, zuerst `session.cookieCache` von Better Auth prüfen.

Restpunkte als Vorschläge:

- Prüfen, ob der Cron-Trigger gelaufen ist (`npx wrangler tail` oder Dashboard, Zeitplan `17 3 * * *`).
- `worker/spielraum.ts:234` nimmt den WebSocket vor der Token-Prüfung an (Audit, `needs_validation`).
- Noch nicht geprüft aus dem Audit: Größe von Anfragen an Better Auth, Verlängerung der Raumlaufzeit durch wirkungslose Aktionen, Gesamtzahl gespeicherter Räume.
- `anfrage-zu-gross` sagt „Das Quiz ist zu groß“, auch bei Konto-Anfragen.
- Ältere Restpunkte: doppelter Code in den Ansichten, Grenzen für Beitritte in einem Raum, `npm audit`, Ubuntu 26 in der CI, Verweis auf den Launcher in der Projektvision, Editor in mehreren Tabs.

## Passende Skills

- `plan-schreiben`: Plan für Schritt 4
- `tdd`: Server-Teil von Schritt 4 testgetrieben bauen
