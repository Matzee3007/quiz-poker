---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-03
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-03. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 2 - Spielraum online|Lernjournal Phase 2 - Spielraum online]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge des Journal-PRs dieser Session)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 2 – Spielraum online läuft, nur die Veröffentlichung fehlt** (Aufgabe 11 in [[projects/quiz-poker/docs/plaene/2026-11-03-spielraum-online|Plan: Spielraum online]]). Das Spiel ist lokal vollständig spielbar.

1. Unter `https://dash.cloudflare.com/sign-up` ein kostenloses Konto anlegen. Das kann nur der Entwickler.
2. Veröffentlichen. Danach ist die Seite für jeden erreichbar, der die Adresse kennt, Kosten entstehen nicht:

   ```bash
   npx wrangler login   # verbindet wrangler im Browser mit dem Konto
   npm run deploy       # baut das Spiel und lädt es hoch, nennt die Adresse
   ```

3. Claude bekommt die Adresse und prüft dort `/api/health` sowie eine ganze Partie. Besonders zu beobachten: WebSockets, Einschlafen und ob das Schließ-Signal auch dort verzögert ist.
4. Adresse in die Doku eintragen, Plan und Roadmap abhaken und Phase 2 mit `journal` und `naechste-session` abschließen.

Danach beginnt Phase 3. Claude fragt vorher, ob etwas anderes ansteht. Restpunkte als Vorschläge:

- Echter Spieleabend schon vor Phase 3, weil das Spiel dann online spielbar ist. Das Beispiel-Quiz ist kurz und selbst formuliert.
- Doppelter Code in den Ansichten: Sortierung nach Chips, `platzVon`, Grenzen 2 und 8.
- Grenzen für Beitritte und Aktionen innerhalb eines Raums. Bisher sind nur neue Räume begrenzt.
- `npm audit` meldete beim Projektstart 15 Schwachstellen in den Entwicklungswerkzeugen.
- `ubuntu-latest` wechselt laut Hinweis im CI-Lauf schrittweise auf Ubuntu 26.

Vor Phase 3 prüfen: Better Auth mit D1, E-Mail-Dienst, Cloudflare Security Audit Skill aus den Tools für später des Ecosystems, Impressum und Datenschutz.

## Passende Skills

- `fertig-pruefen`: bevor die Veröffentlichung als fertig gilt
- `journal`: Phase 2 abschließen
- `grill-with-docs`: Phase 3 klären
