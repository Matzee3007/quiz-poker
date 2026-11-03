---
titel: Lernjournal Phase 0 - Projektvision und CI
status: abgeschlossen
phase: 0
erstellt: 2026-11-03
tags: [lernjournal, phase-0, grill-with-docs, github-actions, cloudflare-d1]
---

# Lernjournal Phase 0: Projektvision und CI

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 0 - Projektstart|Lernjournal Phase 0 - Projektstart]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Projektvision mit `/grill-with-docs` in sechs Fragerunden geschärft (PR #2)
- [x] `docs/Glossar.md` angelegt, [[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]] und [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]] geschrieben
- [x] Plan für den Rest von Phase 0: [[projects/quiz-poker/docs/plaene/2026-11-03-ci-und-abschluss-phase-0|Plan: CI und Abschluss von Phase 0]]
- [x] CI mit GitHub Actions eingerichtet (PR #3), rot mit Probedatei, grün ohne sie
- [x] `/code-review` für PR #3 ohne Funde, `plan-pruefer` meldet den Plan als erfüllt
- [x] Phase 0 abgeschlossen

## Entscheidungen aus `/grill-with-docs`

- **Spiel gegen die Bank:** Ein Modus gegen andere Spieler (Pot) kommt später.
- **Runde:** Genau eine Frage. Der Einsatz ist bis zum Stellen der Frage änderbar, die Freitext-Antwort bis zum Start der
  Auswertung. Der Quiz-Master wertet jede Antwort von Hand als richtig oder falsch aus und spielt nicht mit, es gibt keinen Timer.
- **Chips:** 100 Startchips, Mindesteinsatz 10. Die offene Frage ist entschieden: 5 gesetzte Chips ergeben bei richtiger Antwort
  +5, bei falscher -5. Bei 0 Chips gibt es zu Beginn der nächsten Runde den Mindesteinsatz.
- **Spieler sind Gäste:** Sie treten per Raumcode bei und kehren über ein Token zurück. Einsteigen geht auch während der Partie.
- **Quiz-Sammlung:** Liegt in D1, private Quizze sieht nur ihr Ersteller. Öffentliche Quizze lassen sich als eigene, zunächst
  private Kopie übernehmen. Die Seite ist frei erreichbar, aber nicht beworben.
- **Konten nur für Quiz-Master und Ersteller:** Login mit bestätigter E-Mail-Adresse und Passwort, damit sich Passwörter
  zurücksetzen lassen.
- **Roadmap:** Phase 2 läuft mit fest eingebautem Beispiel-Quiz, Konten, Editor und D1 kommen erst in Phase 3.

## Befehle: CI

```bash
gh pr checks 3 --watch
gh run view 41686221658 --log-failed
gh run list --branch ci/github-actions --limit 1
npm install --package-lock-only --ignore-scripts
```

- `gh pr checks 3 --watch`: zeigt die Checks des PRs und wartet, bis sie fertig sind.
- `gh run view <id> --log-failed`: zeigt nur die Log-Zeilen des fehlgeschlagenen Schritts, um den Grund für Rot zu prüfen.
- `gh run list --branch <branch> --limit 1`: zeigt den letzten CI-Lauf eines Branches.
- `npm install --package-lock-only --ignore-scripts`: gleicht `package-lock.json` an die neue Angabe `engines` an, ohne Pakete zu
  installieren oder Skripte auszuführen.

## Neu gelernt

### Fachbegriffe zuerst klären

Im Gespräch meinte „Runde“ einmal eine Frage und einmal ein ganzes Spiel, und „Quiz-Raum“ kollidierte mit dem Spielraum. Das Glossar
legt je ein Wort fest: Runde, Partie, Spielraum, Quiz-Sammlung.

### Eine Anforderung kann die Architektur verändern

Private Quizze auf allen Geräten lassen sich ohne Konten nicht zuverlässig lösen. Daraus wurden eine Datenbank und ein Login. Für
die Rolle Quiz-Master reicht das, Spieler bleiben Gäste, damit der Einstieg am Abend einfach bleibt.

### CI: Erst rot, dann grün

Eine absichtlich falsch formatierte Probedatei macht die CI rot und zeigt so, dass sie wirklich Fehler findet. Ein grüner Lauf allein
würde das nicht belegen.

### Cloudflare D1

Eine SQL-Datenbank von Cloudflare, die allen Spielräumen gemeinsam zur Verfügung steht. Im kostenlosen Tarif schlägt sie über den
Tageslimits fehl, statt Kosten zu erzeugen (Details in ADR 0002).

## Fehler und Lösungen

### `[warn] src/ci-probe.ts` / `Code style issues found in the above file`

- **Wo:** CI-Lauf 41686221658, Schritt „Prüfungen“. Der Fehler war Absicht.
- **Ursache:** Die Probedatei war nicht nach Prettier formatiert.
- **Lösung:** Probedatei gelöscht.
- **Prüfen:** `gh pr checks <nr>` zeigt `check pass`.

## Aus dem Chat

-

## Offene Fragen

- Betreiberpflichten vor der Veröffentlichung von Phase 3: Impressum, Datenschutz und Umgang mit Inhalten sind rechtlich nicht
  geprüft.
- Arbeitet Better Auth mit D1 zusammen, und welcher Dienst verschickt die E-Mails? Beides wird vor Phase 3 geprüft.
- `ubuntu-latest` wechselt laut Hinweis im CI-Lauf schrittweise auf Ubuntu 26. Das ist noch kein Fehler, kann aber künftige Läufe
  verändern.
- Die CI-Läufe zeigen nicht, ob `allowScripts` dort gegriffen hat, nur dass Build und Tests laufen.

## Nächste Schritte

1. Fragen, ob vor Phase 1 etwas anderes ansteht.
2. Phase 1 (Regelkern) mit `plan-schreiben` planen und mit `tdd` umsetzen.
