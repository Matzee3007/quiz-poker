---
titel: Lernjournal Phase 3 - AGENTS und Playwright
status: abgeschlossen
phase: 3
erstellt: 2026-11-07
tags: [lernjournal, phase-3, codex, playwright, claude-code, d1, svelte]
---

# Lernjournal Phase 3: AGENTS und Playwright

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Quizze speichern|Lernjournal Phase 3 - Quizze speichern]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] `AGENTS.md` ist nur noch ein Verweis auf die `CLAUDE.md` (PR #23), weil Codex als zweites Werkzeug dient, wenn die Tokens von Claude aufgebraucht sind
- [x] Entschieden: Playwright kommt als erste Aufgabe in den Plan für Schritt 4, als eigener Befehl `npm run test:browser`, vorerst nicht in `npm run check` und nicht in der CI
- [x] Ecosystem: Punkt „`AGENTS.md` der Projekte als Verweis“ in dessen Übergabe (PR #155)
- [x] Ecosystem: neue Regel „Immer auf Deutsch antworten“ in der globalen `CLAUDE.md` (PR #157)
- [x] Plan für Schritt 4 geschrieben: [[projects/quiz-poker/docs/plaene/2026-11-07-oeffentliche-quizze|Öffentliche Quizze, Kopien und Schutzregeln]], 11 Aufgaben. Entscheidungen des Entwicklers: Spielen über die Quiz-ID, öffentliche Quizze bleiben beim Speichern spielbar, Sammlung mit Blättern (je 20), Playwright als eigener PR zuerst
- [x] Browser-Durchlauf mit Playwright im Repo (PR #25): `@playwright/test` 1.64.1 fest, `npm run test:browser`, `docs/tools/Playwright.md`, [[projects/quiz-poker/docs/adr/0007-browser-durchlauf-mit-playwright|ADR 0007]]. `/code-review`: 9 Funde, 7 behoben
- [x] Server testgetrieben: Spalte `oeffentlich_seit` (Migration 0003), Sichtbarkeit umschalten, `GET /api/sammlung` mit Zeiger, Kopie übernehmen, `POST /api/raeume { quizId }` ([[projects/quiz-poker/docs/adr/0008-spielraum-ueber-quiz-id|ADR 0008]])
- [x] Mock mit dem Agent `mock-bauer`, Freigabe: Startseite A, Kippschalter B, Link „Auf privat stellen“ im Editor
- [x] Ansichten: Sammlung, vierter Weg auf der Startseite, Kippschalter in „Meine Quizze“, Beispiel-Quiz als Vorlage, Editor eines öffentlichen Quiz. Browser-Durchlauf auf 11 Tests erweitert
- [x] `/security-review` ohne Funde, `/code-review` 8 Funde (6 behoben), `plan-pruefer` 4 Lücken in Tests und Doku (geschlossen). PR #26 gemergt, 387 Tests
- [x] Veröffentlicht: Migration auf die echte D1, `npm run deploy`, echter Durchlauf mit zwei Test-Konten, CPU-Messung, danach D1 leer
- [x] **Phase 3 – Quiz-Sammlung abgeschlossen**

## Befehle: Arbeiten in einem anderen Repo

```bash
cd ~/claude-ecosystem && git branch --show-current && git status --short
gh pr list --state open --head config/kontext-schlanker
git add config/CLAUDE.md
```

- `git branch --show-current` und `git status --short`: zeigen vor jeder Änderung in einem fremden Repo, ob dort gerade gearbeitet wird. Hier stand das Ecosystem zuerst auf einem anderen Branch mit offenem PR #153, deshalb wartete der Eintrag, bis der Entwickler dort fertig war.
- `gh pr list --head <branch>`: zeigt den offenen PR zu einem Branch.
- `git add <datei>`: nur die eigene Datei committen. Die drei ungespeicherten Dateien des Entwicklers im Ecosystem blieben so unberührt.

## Befehle: Playwright

```bash
npm install --save-dev --save-exact @playwright/test@1.64.1
npx playwright install --dry-run chromium
npm run test:browser
npx playwright test --reporter=line
```

- `--save-exact`: trägt die Version ohne `^` ein. Jede Playwright-Version gehört zu genau einem Browser, 1.64.1 passt zu `chromium-1248` im Cache.
- `npx playwright install --dry-run chromium`: zeigt, welchen Browser-Ordner die installierte Version erwartet, ohne etwas zu laden.
- `npm run test:browser`: Browser-Durchlauf, startet bei Bedarf den lokalen Server (`npx vite --strictPort`).
- `--reporter=line`: knappe Ausgabe, gut zum Durchsuchen mit `grep`.

## Befehle: Veröffentlichen und messen

```bash
npx wrangler d1 migrations apply quiz-poker --local
npx wrangler d1 migrations apply quiz-poker --remote
npm run deploy
npx wrangler tail quiz-poker --format json > tail.jsonl
gh pr checks 26 --watch --interval 15
```

- `migrations apply --local` / `--remote`: neue Migration erst auf die lokale, vor dem Hochladen auf die echte D1. Sonst läuft neuer Code gegen eine Tabelle ohne die neue Spalte.
- `wrangler tail --format json`: schreibt jede Anfrage an den echten Worker mit CPU-Zeit (`cpuTime`) und Ausgang (`outcome`) mit. Im Hintergrund gestartet und danach mit Python ausgewertet.
- `gh pr checks <nr> --watch`: wartet, bis die CI des PRs fertig ist.

## Neu gelernt

### Verweis statt Kopie

Die alte `AGENTS.md` war eine Kopie der `CLAUDE.md` mit „Codex“ statt „Claude“ und fehlte schon die Änderungen eines Tages. Eine Datei, die nur auf die andere verweist, kann nicht veralten. Laut Übergabe des Ecosystems lädt Claude Code `AGENTS.md`-Dateien zusätzlich als Memory, die Kopie kostete also auch Tokens.

### Eine Regel, eine Stelle

Die Erinnerung „auf Deutsch antworten“ lag zuerst nur im Memory dieses Projekts. Mit der Zeile in der globalen `CLAUDE.md` gilt sie überall, das Memory wurde wieder gelöscht, damit die Regel nicht doppelt steht.

### Blättern mit Zeiger

Statt „Seite 2“ merkt sich die Sammlung den letzten Eintrag (`<oeffentlich_seit>_<id>`) und holt alles davor. Ein neu veröffentlichtes Quiz verschiebt die nächste Seite dadurch nicht. Die `id` entscheidet bei gleichem Zeitpunkt, und ein 21. Treffer zeigt nur, dass es weitergeht.

### Gegenprobe

Nach dem Grün absichtlich eine Sicherheitsbedingung aus dem Code nehmen und schauen, ob ein Test rot wird. So zeigte sich, dass „nur öffentliche kopieren“ und „privat nur für den Besitzer“ wirklich durch Tests geschützt sind. Bleibt alles grün, schützt der Test nichts.

### 401 oder 404

Ein fremdes privates Quiz antwortet 404 wie ein unbekanntes, damit niemand erfährt, ob es die ID gibt. Ohne Anmeldung antwortet es seit dem Review 401, damit eine abgelaufene Anmeldung zum Anmelden führt statt zu „gibt es nicht mehr“. Die Sammlung behandelt beides gleich.

### JSON in SQL lesen

`json_extract(inhalt, '$.titel')` und `json_each` mit `json_group_array` holen Titel und Kategorien direkt in D1. Der Worker muss so nicht 21 ganze Quizze parsen. Online lag `/api/sammlung` danach bei höchstens 2 ms CPU.

### Locator nach sichtbarem Text

Playwright sucht Knöpfe über Rolle und Beschriftung (`getByRole("switch")`, `getByLabel("Titel des Quiz")`). Text sucht es auch in Teilwörtern: `hasText: "öffentlich"` passt auch auf „Veröffentlichen“.

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

### `Cannot find module '@playwright/test'`

- **Wo:** Wegwerf-Skript für Screenshots im Scratchpad
- **Ursache:** Node sucht Pakete im `node_modules` neben der Datei. Das Scratchpad liegt außerhalb des Projekts.
- **Lösung:** den vollen Pfad importieren (`…/quiz-poker/node_modules/@playwright/test/index.js`)
- **Prüfen:** `npx playwright test --config <scratchpad>/bilder.config.ts` → `1 passed`

### `Test timeout of 30000ms exceeded` beim Screenshot-Skript

- **Wo:** Klick auf den Kippschalter im Skript
- **Ursache:** Das Skript traf den Schalter eines unfertigen Quiz, und der ist absichtlich gesperrt. Beim zweiten Versuch passte `hasText: "öffentlich"` auf zwei Kacheln.
- **Lösung:** die Kachel über „spielbar“ bzw. „steht in der Sammlung“ wählen
- **Prüfen:** `1 passed`

### Befehl angehalten: „Blast Radius held this command“

- **Wo:** Befehl mit `rm -rf test-results/…`
- **Ursache:** Ein Befehl mit `rm -rf` braucht eine Freigabe, die innerhalb von 10 Minuten nicht kam. Der ganze Befehl lief dadurch nicht, auch die harmlosen Teile davor.
- **Lösung:** ohne das Löschen wiederholt, `test-results/` steht ohnehin in `.gitignore`
- **Prüfen:** -

### `ReferenceError: lesen is not defined`

- **Wo:** neuer Test „behält die Kopie …“ in `worker/quizze.test.ts`
- **Ursache:** Die Hilfsfunktion `lesen` gab es nur innerhalb anderer `describe`-Blöcke.
- **Lösung:** direkt `anQuizze(cookie, "GET", …)` aufrufen
- **Prüfen:** `npx vitest run worker/quizze.test.ts` → alle grün

## Aus dem Chat

-

## Offene Fragen

- Lädt Claude Code die neue `AGENTS.md` von quiz-poker mit? Beim nächsten Start mit `/context` unter „Memory files“ nachsehen.

## Nächste Schritte

1. Plan für Schritt 4 schreiben, erste Aufgabe: Browser-Durchlauf mit Playwright ins Repo. (erledigt)
2. Phase 4 – Spieleabend beginnt. Vorher fragen, ob etwas anderes ansteht, und `docs/Tools für später.md` prüfen.
