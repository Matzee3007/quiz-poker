---
titel: Nächste Session
status: aktiv
erstellt: 2026-11-15
tags: [session, übergabe]
---

# Nächste Session

Stand vom 2026-11-15. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]], letztes Journal: [[projects/quiz-poker/docs/journal/Lernjournal Phase 4 - Betrieb und Handy|Lernjournal Phase 4 - Betrieb und Handy]].

## Stand bei Sessionende

- **Branch:** `main` (nach dem Merge von PR #33)
- **Offene PRs:** keine
- **Nicht committet:** nichts

## Vor dem Start

1. Claude Code im Projektordner starten, damit die Projekt-`CLAUDE.md` geladen wird:

   ```bash
   cd ~/claude-ecosystem/projects/quiz-poker
   claude
   ```

## Womit es weitergeht

**Phase 4 – Spieleabend läuft.** Erledigt sind die Absicherung des Betriebs (PR #31,
[[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen|ADR 0009]]) und das Handy-Layout für Spieler (PR #32,
[[projects/quiz-poker/docs/plaene/2026-11-09-handy-layout|Plan]], [[projects/quiz-poker/docs/adr/0010-webkit-fuer-handy-durchlauf|ADR 0010]]).
Beides ist online (Version `db060a61`).

**Claude fragt zuerst, ob der Spieleabend schon stattgefunden hat.**

1. **Hat er stattgefunden:** Beobachtungen auswerten und für den Feinschliff sammeln. Danach entscheidet der
   Entwickler, was gebaut wird. Vorher mit `plan-schreiben` einen Plan schreiben.
2. **Noch nicht:** Vorbereitung anbieten, z. B. ein eigenes Quiz anlegen. Oder einen Restpunkt unten angehen.

Offene Hinweise aus dieser Session:

- Ansichten des Quiz-Masters, Editor und Konto sind am Handy nicht angepasst (bewusst außerhalb des Plans).
- Die Rangliste mit mehr als 10 Spielern am Handy ist nicht im Browser gesehen. Das Panel scrollt laut CSS selbst.
- `worker/auth.test.ts` lief einmal in den Timeout von 5 Sekunden, beim zweiten Lauf grün. Tritt das wieder auf,
  mit `fehler-diagnose` eingrenzen.
- `RanglisteLeiste.svelte` sucht die eigene Zeile ein zweites Mal (Review-Fund 10, bewusst gelassen).

Restpunkte als Vorschläge:

- Ungeprüft: Was sehen Spieler, wenn mitten im Spiel eine Grenze des kostenlosen Tarifs erreicht ist? Ein Wiederherstellen
  aus D1 einmal proben (aus [[Engineering for Vibe Coders - Auswertung]]).
- Test, dass ein Spieler vor der Auflösung keine Lösung über den WebSocket bekommt. Der Handy-Test prüft das nur an
  der Oberfläche (`not.toContainText("Canberra")`), nicht an den Nachrichten des Servers.
- Noch nicht geprüft aus dem Audit: Größe von Anfragen an Better Auth, Verlängerung der Raumlaufzeit durch wirkungslose
  Aktionen, Gesamtzahl gespeicherter Räume.
- `anfrage-zu-gross` sagt „Das Quiz ist zu groß“, auch bei Konto-Anfragen.
- Beim Start mit `/context` unter „Memory files“ nachsehen, ob Claude Code die `AGENTS.md` mitlädt (offen seit 2026-11-07).
- Ältere Restpunkte: doppelter Code in den Ansichten, Grenzen für Beitritte in einem Raum, `npm audit`, Ubuntu 26 in der
  CI, Verweis auf den Launcher in der Projektvision, Editor in mehreren Tabs, wrangler 4.162 verfügbar (installiert 4.157).

Im Blick behalten: Die Sitzungsabfrage braucht im Betrieb zum Teil mehr als 10 ms CPU (Nachmessungen in
[[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]). Treten Fehler 1102 auf, zuerst
`session.cookieCache` von Better Auth prüfen. Die GitHub Action `cron-pruefen` meldet einen ausgefallenen Lösch-Lauf als
roten Workflow.

## Passende Skills

- `plan-schreiben`: Feinschliff nach dem Spieleabend planen
- `tdd`: Änderungen an Regeln und Server testgetrieben bauen
- `fehler-diagnose`: falls beim Spieleabend etwas kaputt war
