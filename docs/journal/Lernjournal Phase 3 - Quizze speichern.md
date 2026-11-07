---
titel: Lernjournal Phase 3 - Quizze speichern
status: abgeschlossen
phase: 3
erstellt: 2026-11-06
tags: [lernjournal, phase-3, d1, better-auth, svelte, playwright, sicherheit]
---

# Lernjournal Phase 3: Quizze speichern

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - Konten|Lernjournal Phase 3 - Konten]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Plan für Schritt 3 geschrieben und freigegeben: [[projects/quiz-poker/docs/plaene/2026-11-06-quizze-speichern|Plan]]
- [x] `entwurfPruefen`: unfertige Quizze speichern, Grenzen gelten trotzdem
- [x] Tabelle `quiz` (Migration `0002_quizze.sql`) und Wege `/api/quizze`, nur für den Besitzer, fremde IDs → 404
- [x] Höchstens 20 Quizze je Konto, auch bei gleichzeitigen Anfragen
- [x] Konto löschen löscht die Quizze mit (`ON DELETE CASCADE`), lokal und in der echten D1 geprüft
- [x] Audit-Fund behoben: Eine Anmeldung, die ein Zurücksetzen des Passworts überholt, wird verworfen
- [x] Betreiber-Befehl `npm run quiz-loeschen -- <id>`, vertippte Optionen brechen alle Betreiber-Befehle ab
- [x] Mock mit `mock-bauer`, freigegeben: Startseite A, Liste B (Karten), Editor A
- [x] Oberfläche: Meine Quizze, Editor für gespeicherte Quizze, Konto-Seite, Datenschutztext
- [x] `/security-review` ohne Funde, `/code-review` mit 10 Funden, 5 davon behoben
- [x] `plan-pruefer`: eine Lücke (fehlender Test), geschlossen
- [x] PR #21 gemergt, veröffentlicht, Browser-Durchlauf gegen die echte Adresse mit 24 Prüfungen bestanden
- [ ] `AGENTS.md`: Entscheidung des Entwicklers offen

## Befehle: Datenbank und Betrieb

```bash
npx wrangler d1 migrations apply quiz-poker --local
npx wrangler d1 migrations apply quiz-poker --remote
npm run quiz-loeschen -- --lokal <id>
npx wrangler d1 execute quiz-poker --local --command 'DELETE FROM "rateLimit"'
npx wrangler d1 create quiz-poker-fk-probe
npx wrangler d1 execute quiz-poker-fk-probe --remote --yes --file <datei.sql>
npx wrangler d1 delete quiz-poker-fk-probe --skip-confirmation
```

- `migrations apply … --local`: legt die neue Tabelle in der lokalen Datenbank für `npm run dev` an.
- `migrations apply … --remote`: dasselbe in der echten Datenbank, immer vor `npm run deploy`.
- `quiz-loeschen -- --lokal <id>`: neuer Betreiber-Befehl, hier gegen die lokale Datenbank ausprobiert.
- `DELETE FROM "rateLimit"`: leert lokal den Zähler der Anmeldeversuche, damit wiederholte Browser-Durchläufe nicht an der Grenze von 10 Versuchen scheitern.
- `d1 create`, `execute --file`, `d1 delete`: Wegwerf-Datenbank bei Cloudflare, um zu prüfen, ob die echte D1 Fremdschlüssel durchsetzt, ohne die echte Datenbank anzufassen.

## Befehle: Messen und Veröffentlichen

```bash
npx wrangler whoami
npx wrangler tail quiz-poker --format json
npm run deploy
gh pr checks 21 --watch --interval 20
gh pr merge 21 --merge --delete-branch
```

- `wrangler whoami`: zeigt, ob und mit welchen Rechten `wrangler` angemeldet ist. Half bei der Fehlersuche unten.
- `wrangler tail --format json`: Live-Log des Workers mit CPU-Zeit je Anfrage, als JSON zum Auswerten. Es ist eine Stichprobe, nicht jede Anfrage erscheint.
- `npm run deploy`: baut und lädt zu Cloudflare hoch.
- `gh pr checks --watch`: wartet, bis die CI des PRs fertig ist.
- `gh pr merge --merge --delete-branch`: übernimmt den PR in `main` und löscht den Branch.

## Neu gelernt

### Grenze in einem einzigen SQL-Befehl

`INSERT INTO quiz (…) SELECT … WHERE (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < 20` zählt und fügt in einem Schritt ein. Zwei gleichzeitige Anfragen können die Grenze so nicht gemeinsam überschreiten. `meta.changes === 0` heißt, die Grenze hat gegriffen.

### Fremdschlüssel mit `ON DELETE CASCADE`

Die Spalte `besitzer` verweist auf `user.id`. Wird das Konto gelöscht, löscht D1 seine Quizze selbst mit. D1 setzt Fremdschlüssel durch, das zeigte die Wegwerf-Datenbank.

### 404 statt 403 für fremde Quizze

Ein fremdes Quiz antwortet genauso wie ein unbekanntes. So erfährt niemand durch Probieren, welche IDs es gibt.

### Wettlauf im Test nachstellen

Better Auth prüft das alte Passwort und legt die Sitzung erst danach an. Im Test ersetzt `vi.spyOn(env.PASSWORTRECHNER, "getByName")` den ersten Aufruf durch einen Nachbau, der genau in diesem Moment das Passwort ändert. Vor dem Fix antwortete die Anmeldung mit 200, danach mit 401.

### `$state.snapshot` statt `structuredClone`

Svelte hüllt Daten in `$state` in einen Proxy. `structuredClone` kann ihn nicht kopieren, `$state.snapshot` liefert eine einfache Kopie.

### `beforeunload` und `popstate`

Der Browser fragt von selbst nur, wenn ein ganzes Dokument verlassen wird. Navigiert die App innerhalb der Seite (Zurück-Knopf, eigene Links), muss sie selbst mit `confirm` nachfragen.

## Fehler und Lösungen

### `Cannot perform I/O on behalf of a different request`

- **Wo:** Wettlauf-Test in `worker/auth.test.ts`
- **Ursache:** Der Stub des Durable Objects entstand im Test und wurde in der Anfrage des Workers benutzt. Cloudflare bindet solche Objekte an ihre Anfrage.
- **Lösung:** Den echten Stub erst im Nachbau holen, also innerhalb der Anfrage.
- **Prüfen:** `npx vitest run worker/auth.test.ts`

### `Failed to execute 'structuredClone' on 'Window': #<Object> could not be cloned.`

- **Wo:** Editor für ein gespeichertes Quiz, nur im Browser sichtbar („Einen Moment …“ blieb stehen)
- **Ursache:** Das geladene Quiz lag in `$state` und war damit ein Proxy.
- **Lösung:** `$state.snapshot(anfang.quiz)` statt `structuredClone`
- **Prüfen:** Browser-Durchlauf meldet `ALLES OK`

### `(eval):[:1: unknown condition: -eq`

- **Wo:** `npm run check` mit Commit in einem Befehl
- **Ursache:** zsh kennt `PIPESTATUS` aus bash nicht, die Prüfung danach scheiterte, obwohl der Check grün war.
- **Lösung:** `if npm run check > log 2>&1; then git commit …; fi`
- **Prüfen:** Der Commit entsteht nur bei grünem Check.

### `Authentication error [code: 10000]`

- **Wo:** `npx wrangler d1 create quiz-poker-fk-probe`
- **Ursache:** unklar. `wrangler whoami` zeigte die Anmeldung mit `d1 (write)`, `d1 list` funktionierte.
- **Lösung:** Derselbe Befehl klappte beim zweiten Versuch.
- **Prüfen:** `npx wrangler d1 list`

### `strict mode violation: getByRole('button', { name: 'Meine Quizze' }) resolved to 2 elements`

- **Wo:** Browser-Durchlauf
- **Ursache:** „Zurück zu Meine Quizze“ passt auch auf den Namen.
- **Lösung:** `{ name: "Meine Quizze", exact: true }`
- **Prüfen:** Durchlauf meldet `ALLES OK (23)`

## Aus dem Chat

-

## Offene Fragen

- `AGENTS.md` ist eine Kopie der `CLAUDE.md` für Codex, entstanden am 2026-11-05 um 21:41 wie die in `karten-app`. Soll sie ins Repo, weg oder bleiben?
- Die Sitzungsabfrage braucht im echten Betrieb zum Teil mehr als 10 ms CPU (bis 60 ms), ohne dass Cloudflare abbricht (ADR 0005, Nachmessung). Ob das so bleibt, zeigt erst der Betrieb.

## Nächste Schritte

1. Plan für Schritt 4 schreiben: öffentliche Quizze, Kopien (auch das Beispiel-Quiz als Vorlage) und Schutzregeln.
2. Dabei neu bewerten, ob „Spielen“ das Quiz über seine ID statt über den Inhalt eröffnet (Review-Fund 9).
3. Entscheiden, ob der Browser-Durchlauf mit Playwright ins Repo kommt (neue Abhängigkeit).
