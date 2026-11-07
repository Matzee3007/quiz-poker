---
titel: "Plan: Öffentliche Quizze, Kopien und Schutzregeln"
status: aktiv
erstellt: 2026-11-07
tags: [plan, phase-3, quiz-sammlung, d1, playwright]
---

# Plan: Öffentliche Quizze, Kopien und Schutzregeln

**Ziel:** Quiz-Master stellen fertige Quizze öffentlich, jeder sieht sie in der Sammlung und spielt sie ohne Konto, mit Konto lassen sie sich (wie das Beispiel-Quiz) als eigene private Kopie übernehmen. Davor kommt ein Browser-Durchlauf mit Playwright ins Repo.

**Vorgehen:** Zuerst Playwright als eigener PR, der den heutigen Stand prüft. Danach testgetrieben auf dem Server: Spalte für „öffentlich“, Sichtbarkeit umschalten, Sammlung mit Blättern, Kopien, Spielraum über die Quiz-ID. Dann Mock, Anfragen und Ansichten, Datenschutz, Browser-Durchlauf erweitern, Reviews und Veröffentlichung.

**Technik:** Cloudflare D1, Better Auth 1.7.17 (nur `auth.api.getSession`), Svelte 5, Vitest 4, neu `@playwright/test` als Entwicklungs-Abhängigkeit.

**Anforderung:** Schritt 4 von Phase 3 in [[projects/quiz-poker/docs/Projektvision|Projektvision]], Abschnitt „Quiz-Sammlung“, [[projects/quiz-poker/docs/Nächste Session|Übergabe]] vom 2026-11-07, Plan von Schritt 3: [[projects/quiz-poker/docs/plaene/2026-11-06-quizze-speichern|Quizze speichern]].

**Entscheidungen des Entwicklers vom 2026-11-07:**

- **Spielen über die ID:** Gespeicherte Quizze (eigene und öffentliche) eröffnen den Spielraum mit `POST /api/raeume { quizId }`, der Server liest den Inhalt selbst aus D1. Das Einmal-Quiz schickt weiter `{ quiz }`, ohne Inhalt gilt weiter das Beispiel-Quiz. Ersetzt die Entscheidung „Spielen schickt den Inhalt“ aus Schritt 3 (ADR 0008, Aufgabe 10).
- **Öffentliche Quizze bleiben spielbar:** Speichern eines unfertigen Stands eines öffentlichen Quiz → 422 `oeffentlich-unfertig`. Fertige Änderungen sind sofort öffentlich.
- **Sammlung mit Blättern:** je 20 Einträge, Knopf „Mehr laden“.
- **Playwright als eigener PR zuerst** (Aufgabe 1, Branch `feature/playwright`). Alles andere auf `feature/oeffentliche-quizze`.

**Entscheidungen, die der Plan trifft** (beim Lesen prüfen):

- Das Beispiel-Quiz als Vorlage braucht keinen neuen Weg: Die Oberfläche legt es mit dem vorhandenen `POST /api/quizze { quiz: BEISPIEL_QUIZ }` an.
- Kopieren geht nur bei öffentlichen Quizzen (auch beim eigenen öffentlichen). Die Kopie behält den Titel, ist privat und zählt zu den 20.
- Die Sammlung sortiert nach dem Zeitpunkt des Veröffentlichens, nicht nach der letzten Änderung. Wer ein Quiz privat und wieder öffentlich stellt, rückt nach oben.
- Blättern über einen Zeiger (`weiter`) statt Seitennummern: Ein neu veröffentlichtes Quiz verschiebt die nächste Seite nicht, kein Eintrag erscheint doppelt.

## Feste Vorgaben

- Eine Spalte `oeffentlich_seit INTEGER` (Millisekunden, `NULL` heißt privat), Migration `0003_oeffentlich.sql`. Vorhandene Quizze bleiben privat.
- Neue Quizze und Kopien sind privat. Ein Feld `oeffentlich` im Inhalt bei `POST` oder `PUT` hat keine Wirkung.
- Öffentlich werden darf nur ein spielbares Quiz (`quizPruefen(...).ok`), sonst 422 `quiz-unfertig`.
- Die Sammlung liefert je Quiz nur `id`, `titel`, `kategorien` (Namen) und `veroeffentlichtAm`. Keine Fragen, keine Lösungen, kein Besitzer.
- Ein privates Quiz liest, spielt oder kopiert nur sein Besitzer, fremde und unbekannte IDs antworten 404 `quiz-unbekannt`. SQL immer mit `besitzer = ?` oder `oeffentlich_seit IS NOT NULL`.
- Ändernde Anfragen und `POST /api/raeume` mit `quizId` brauchen den eigenen `Origin`, sonst 403 `fremde-herkunft` (`eingabeLesen` bzw. dieselbe Prüfung wie beim Löschen).
- Grenzen bleiben: `QUIZ_GRENZEN` (10 Kategorien, 10 Fragen, 300/100 Zeichen, 20 Quizze je Konto), auch für Einmal-Quizze, das prüft `quizPruefen` schon heute.
- Spielraum ohne Konto, Einmal-Quiz und Beispiel-Quiz funktionieren weiter, die vorhandenen Tests bleiben grün.
- Jeder PR bekommt `/code-review`, PR B zusätzlich `/security-review`. Vor jedem Commit `npm run check`. Vitest bleibt bei Version 4. Oberfläche auf Deutsch, Stil C.

## Schnittstelle zwischen Gerät und Server

```text
GET  /api/quizze                   → wie bisher, je Eintrag zusätzlich oeffentlich: boolean
GET  /api/quizze/:id               → wie bisher, zusätzlich oeffentlich: boolean
PUT  /api/quizze/:id { quiz }      → wie bisher | 422 oeffentlich-unfertig
PUT  /api/quizze/:id/sichtbarkeit { oeffentlich: boolean }
                                   → 200 { oeffentlichSeit: number | null } | 401 | 404 | 422 quiz-unfertig, ungueltige-nachricht
POST /api/quizze/:id/kopie         → 201 { id } | 401 | 404 | 409 zu-viele-quizze
GET  /api/sammlung[?weiter=<zeiger>] (ohne Konto)
                                   → 200 { quizze: [{ id, titel, kategorien: string[], veroeffentlichtAm }], weiter: string | null } | 422 ungueltige-nachricht
POST /api/raeume { quizId }        → 201 { raumcode, token } | 403 fremde-herkunft | 404 quiz-unbekannt | 422 leeres-quiz, leeres-feld | 429
```

## Prüf-Schwerpunkte

1. Ein Konto spielt oder kopiert ein fremdes privates Quiz über seine ID: 404 `quiz-unbekannt`, es entsteht kein Raum und keine Kopie (Aufgaben 4 und 5).
2. Der Ersteller stellt ein Quiz auf privat, während ein anderer die Sammlung offen hat und danach „Spielen“ oder „Kopieren“ drückt: 404 `quiz-unbekannt`, die Oberfläche meldet „Dieses Quiz gibt es nicht mehr“ und lädt die Sammlung neu (Aufgaben 4, 5 und 8).
3. Blättern mit 21 öffentlichen Quizzen, zwei davon mit gleichem `oeffentlich_seit` an der Seitengrenze, und einem Quiz, das zwischen Seite 1 und 2 veröffentlicht wird: Seite 2 enthält genau das fehlende Quiz, keines doppelt (Aufgabe 3).
4. Die Kopie ist unabhängig: Original ändern, privat stellen oder mit seinem Konto löschen ändert die Kopie nicht. Bei 20 eigenen Quizzen → 409 (Aufgabe 4).
5. Die Antwort der Sammlung enthält keine Frage, keine Musterlösung und keinen Besitzer, und ein `POST /api/quizze` mit `oeffentlich: true` im Inhalt bleibt privat (Aufgaben 2 und 3).

## Aufgaben

### Aufgabe 1: Browser-Durchlauf mit Playwright (eigener PR)

Branch `feature/playwright`, mit diesem Plan. Inhalt ist der Durchlauf aus Schritt 3 (siehe dessen Plan, „Ergebnis der Reviews“ und Aufgabe 8, Schritt 2).

**Dateien:** Neu `playwright.config.ts`, `browser/durchlauf.spec.ts`, `docs/tools/Playwright.md`. Ändern `package.json`, `package-lock.json`, `tsconfig.node.json` (`browser/**/*.ts` und `playwright.config.ts` in `include`), `.gitignore` (`test-results/`, `playwright-report/`), `docs/tools/Tools Übersicht.md`, `CLAUDE.md` (Struktur und Befehl)

**Schnittstellen:**

- Liefert: `npm run test:browser` (= `playwright test`), von Hand gestartet, nicht in `npm run check` und nicht in der CI. `playwright.config.ts`: nur Chromium, `baseURL` `http://localhost:5173`, `webServer` mit `npm run dev` und `reuseExistingServer: true`.
- Liefert: Hilfe `einladungHolen(): string` in `browser/durchlauf.spec.ts`, ruft `node scripts/einladung.ts --lokal` per `execFileSync` auf und gibt den Link zurück. Jeder Lauf nimmt eine neue Adresse (`test-<Date.now()>@beispiel.de`) und löscht das Konto am Ende.

- [x] **Schritt 1: `@playwright/test` installieren:** Version so wählen, dass sie zu den Browsern in `~/Library/Caches/ms-playwright` passt (`chromium-1248`). Prüfen mit `npx playwright install --dry-run chromium`: erwartet den Ordner `chromium-1248`, sonst Version anpassen statt neue Browser zu laden.
- [x] **Schritt 2: Durchlauf schreiben:** je ein `test` für
  - Konto: Einladung einlösen, registrieren, abmelden, anmelden
  - Meine Quizze: neues Quiz, unfertig speichern, neu laden (Inhalt bleibt), fertig schreiben, „x von 20“ stimmt
  - Editor: ungespeicherte Änderungen → Rückfrage beim Verlassen, Abbrechen behält den Inhalt
  - Spielen: gespeichertes Quiz eröffnet einen Raum, Raumcode sichtbar
  - ohne Konto: Einmal-Quiz und Beispiel-Quiz eröffnen je einen Raum
  - Aufräumen: Konto löschen, danach führt `/quizze` zu `/anmelden`
- [x] **Schritt 3: Laufen lassen:** `npm run test:browser`, erwartet alle Tests PASS. Einmal absichtlich eine Erwartung ändern, erwartet FAIL mit lesbarer Meldung, dann zurück.
- [x] **Schritt 4: Doku:** `docs/tools/Playwright.md` (Zweck, Befehl, braucht laufenden lokalen Server und lokale D1 mit Migrationen, warum nicht in der CI, Fehler mit Ursache und Lösung), Eintrag in `Tools Übersicht.md`, `CLAUDE.md` ergänzen.
- [ ] **Schritt 5: `npm run check`, Commit** `Add Playwright browser run`, `/code-review`, PR erstellen, nach grüner CI und Freigabe mergen.

### Aufgabe 2: Spalte „öffentlich“ und Sichtbarkeit umschalten

Ab hier Branch `feature/oeffentliche-quizze`.

**Dateien:** Neu `migrations/0003_oeffentlich.sql`. Ändern `worker/quizze.ts`, `worker/quizze.test.ts`, `worker/index.ts`

**Schnittstellen:**

- Nutzt: `quizPruefen`, `eingabeLesen`, `fehler`, `anQuizze` aus `worker/testhilfen.ts`
- Liefert:

  ```sql
  ALTER TABLE quiz ADD COLUMN oeffentlich_seit INTEGER;
  CREATE INDEX quiz_oeffentlich_idx ON quiz (oeffentlich_seit, id) WHERE oeffentlich_seit IS NOT NULL;
  ```

  - `quizAnfrage(anfrage, env, id, weg: "sichtbarkeit" | "kopie" | null)`. `worker/index.ts` erkennt `/api/quizze/<id>/(sichtbarkeit|kopie)`.
  - Liste und Lesen liefern `oeffentlich: boolean`.

- [x] **Schritt 1: Fehlschlagende Tests schreiben:**
  - neues Quiz → in Liste und `GET` `oeffentlich: false`, auch mit `oeffentlich: true` im Inhalt
  - Sichtbarkeit `true` bei spielbarem Quiz → 200, `oeffentlichSeit` ist eine Zahl, Liste zeigt `oeffentlich: true`. Nochmal `true` → `oeffentlichSeit` bleibt gleich
  - Sichtbarkeit `true` bei unfertigem Quiz → 422 `quiz-unfertig`
  - Sichtbarkeit `false` → 200 `{ oeffentlichSeit: null }`
  - `{ oeffentlich: "ja" }` → 422 `ungueltige-nachricht`, fremdes Konto → 404, fremder `Origin` → 403, ohne Cookie → 401
  - `PUT /api/quizze/:id` mit unfertigem Inhalt bei öffentlichem Quiz → 422 `oeffentlich-unfertig`, der alte Inhalt bleibt. Mit fertigem Inhalt → 200
- [x] **Schritt 2: Tests laufen lassen:** `npx vitest run worker/quizze.test.ts`, erwartet FAIL.
- [x] **Schritt 3: Migration und Wege schreiben:** Veröffentlichen in einem Befehl: `UPDATE quiz SET oeffentlich_seit = COALESCE(oeffentlich_seit, ?) WHERE id = ? AND besitzer = ? AND spielbar = 1`. Bei `changes === 0` mit einem `SELECT spielbar` 404 und 422 unterscheiden. Ändern: `WHERE … AND (oeffentlich_seit IS NULL OR ? = 1)` mit `spielbar` als Wert, bei `changes === 0` ebenso unterscheiden. Die Migration lokal anwenden: `npx wrangler d1 migrations apply quiz-poker --local`.
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS, auch alle bisherigen.
- [x] **Schritt 5: `npm run check`, Commit** `Add public visibility for saved quizzes`.

### Aufgabe 3: Sammlung mit Blättern

**Dateien:** Neu `worker/sammlung.ts`, `worker/sammlung.test.ts`. Ändern `worker/index.ts`

**Schnittstellen:**

- Liefert: `SAMMLUNG_SEITE = 20`, `sammlungAnfrage(anfrage: Request, env: Env): Promise<Response>` für `GET /api/sammlung`, andere Methoden → 405. Zeiger `weiter` ist `"<oeffentlich_seit>_<id>"` des letzten Eintrags, `null` auf der letzten Seite.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben:**
  - ohne Cookie → 200, nur öffentliche Quizze, neueste zuerst, private fehlen
  - jeder Eintrag hat genau die Schlüssel `id`, `titel`, `kategorien`, `veroeffentlichtAm` (Prüf-Schwerpunkt 5), `kategorien` sind die Namen in ihrer Reihenfolge
  - 21 öffentliche Quizze (über zwei Konten verteilt, zwei mit gleichem `oeffentlich_seit` an Platz 20 und 21, direkt in D1 gesetzt): Seite 1 hat 20 und `weiter`, Seite 2 hat genau 1 und `weiter: null`. Zwischen den Seiten ein neues Quiz veröffentlichen: Seite 2 bleibt gleich (Prüf-Schwerpunkt 3)
  - `?weiter=kaputt` → 422 `ungueltige-nachricht`
- [ ] **Schritt 2: Tests laufen lassen:** `npx vitest run worker/sammlung.test.ts`, erwartet FAIL.
- [ ] **Schritt 3: `sammlungAnfrage` schreiben:** `WHERE oeffentlich_seit IS NOT NULL AND (oeffentlich_seit, id) < (?, ?) ORDER BY oeffentlich_seit DESC, id DESC LIMIT 21`. Der 21. Treffer heißt nur „es gibt mehr“. Kategorien in TypeScript aus `inhalt` lesen. Zeiger mit `^(\d+)_([0-9a-f-]{36})$` prüfen.
- [ ] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [ ] **Schritt 5: `npm run check`, Commit** `Add public quiz collection with paging`.

### Aufgabe 4: Kopie übernehmen

**Dateien:** Ändern `worker/quizze.ts`, `worker/quizze.test.ts`

**Schnittstellen:** Nutzt `quizAnfrage` mit `weg = "kopie"` aus Aufgabe 2. Liefert `POST /api/quizze/:id/kopie` → 201 `{ id }`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben:**
  - öffentliches Quiz eines anderen Kontos kopieren → 201, neue ID, in der eigenen Liste mit gleichem Titel, `oeffentlich: false`, `spielbar: true`
  - fremdes privates und unbekanntes Quiz → 404, keine neue Zeile (Prüf-Schwerpunkt 1)
  - Original danach ändern, privat stellen und sein Konto löschen → die Kopie ist unverändert da (Prüf-Schwerpunkt 4)
  - bei 20 eigenen Quizzen → 409 `zu-viele-quizze`
  - ohne Cookie → 401, fremder `Origin` → 403
- [ ] **Schritt 2: Tests laufen lassen:** erwartet FAIL.
- [ ] **Schritt 3: Kopieren in einem Befehl:** `INSERT INTO quiz (id, besitzer, inhalt, spielbar, geaendert_am) SELECT ?, ?, inhalt, spielbar, ? FROM quiz WHERE id = ? AND oeffentlich_seit IS NOT NULL AND (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < ?`. Bei `changes === 0` mit einem `SELECT` 404 und 409 unterscheiden.
- [ ] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [ ] **Schritt 5: `npm run check`, Commit** `Add copying public quizzes`.

### Aufgabe 5: Spielraum über die Quiz-ID

**Dateien:** Ändern `worker/index.ts`, `worker/quizze.ts`, `worker/spielraum.test.ts` (dort stehen die Tests für `POST /api/raeume`)

**Schnittstellen:**

- Liefert: `gespeichertesQuizLesen(anfrage: Request, env: Env, quizId: string): Promise<{ ok: true; quiz: Quiz } | { ok: false; status: number; code: string }>` in `worker/quizze.ts`. Liest `inhalt`, `besitzer`, `oeffentlich_seit`. Öffentlich → gilt. Privat → nur mit Sitzung des Besitzers, sonst 404. Danach `quizPruefen`.
- `quizAusAnfrage` in `worker/index.ts` erkennt `{ quizId }` und ruft es auf, prüft vorher den `Origin`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben:**
  - eigenes privates Quiz mit Cookie → 201 mit Raumcode, der Raum hat genau dieses Quiz
  - öffentliches Quiz ohne Cookie → 201
  - fremdes privates Quiz → 404 `quiz-unbekannt`, unbekannte ID und `abc` → 404 (Prüf-Schwerpunkt 1)
  - eigenes unfertiges Quiz → 422 `leeres-feld` oder `leeres-quiz`
  - `quizId` mit fremdem `Origin` → 403
  - Quiz nach dem Eröffnen ändern → der Raum behält den alten Inhalt
  - ohne Inhalt weiter Beispiel-Quiz, `{ quiz }` weiter Einmal-Quiz
- [ ] **Schritt 2: Tests laufen lassen:** erwartet FAIL.
- [ ] **Schritt 3: Schreiben:** Die Sitzung nur abfragen, wenn das Quiz privat ist (spart die Rechenzeit der Sitzungsabfrage, ADR 0005).
- [ ] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [ ] **Schritt 5: `npm run check`, Commit** `Open rooms from saved quizzes by id`.

### Aufgabe 6: Mock (Entwickler)

- [ ] **Schritt 1: Mock mit dem Agent `mock-bauer` bauen:** Sammlung (Karten mit Titel, Kategorien, „veröffentlicht am“, Spielen, mit Konto Kopieren, „Mehr laden“, leere Sammlung), Weg dorthin von der Startseite, in „Meine Quizze“ Kennzeichen „öffentlich“, Umschalten öffentlich/privat und „Beispiel-Quiz als Vorlage“, im Editor der Hinweis, dass ein öffentliches Quiz spielbar bleiben muss. Stil C, Ablage `docs/mocks/2026-11-07-sammlung.html`.
- [ ] **Schritt 2: Freigabe des Entwicklers abwarten.** Ohne Freigabe keine Aufgabe 8.

### Aufgabe 7: Anfragen der Oberfläche

**Dateien:** Ändern `src/quizSammlung.ts`, `src/quizSammlung.test.ts`, `src/raumEroeffnen.ts`, `src/raumEroeffnen.test.ts`, `src/meldungen.ts`

**Schnittstellen:**

- Liefert:

  ```ts
  type QuizEintrag = { id: string; titel: string; spielbar: boolean; oeffentlich: boolean; geaendertAm: number };
  type SammlungEintrag = { id: string; titel: string; kategorien: string[]; veroeffentlichtAm: number };
  type SammlungSeite = { quizze: SammlungEintrag[]; weiter: string | null };
  sammlungLaden(weiter: string | null): Promise<Ergebnis<SammlungSeite>>
  quizKopieren(id: string): Promise<Ergebnis<string>>                          // die neue ID
  sichtbarkeitSetzen(id: string, oeffentlich: boolean): Promise<Ergebnis<number | null>>
  raumMitQuizEroeffnen(quizId: string): Promise<Eroeffnung>                    // in src/raumEroeffnen.ts
  ```

- [ ] **Schritt 1: Fehlschlagende Tests schreiben (nachgebautes `fetch`):** richtige Pfade und Methoden, `weiter` landet URL-kodiert in der Adresse, 404 → `quiz-unbekannt`, 409 → `zu-viele-quizze`, 422 → `quiz-unfertig` bzw. `oeffentlich-unfertig`, Netzfehler → `keine-verbindung`. Neue Meldungen:
  - `quiz-unfertig`: „Nur ein fertiges Quiz kann öffentlich werden. Bitte fülle zuerst alle Felder aus.“
  - `oeffentlich-unfertig`: „Ein öffentliches Quiz muss spielbar bleiben. Fülle alle Felder aus oder stelle es zuerst auf privat.“
- [ ] **Schritt 2: Tests laufen lassen:** `npx vitest run src/quizSammlung.test.ts src/raumEroeffnen.test.ts`, erwartet FAIL.
- [ ] **Schritt 3: Funktionen und Meldungen schreiben.**
- [ ] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [ ] **Schritt 5: `npm run check`, Commit** `Add client requests for public quizzes`.

### Aufgabe 8: Ansichten

**Dateien:** Neu `src/ansichten/Sammlung.svelte`. Ändern `src/App.svelte`, `src/ansichten/Start.svelte`, `src/ansichten/Quizze.svelte`, `src/ansichten/QuizEditor.svelte`

**Schnittstellen:** Nutzt Aufgabe 7. Liefert den Pfad `/sammlung` (ohne Konto erreichbar, in `KONTO_PFADE`).

- [ ] **Schritt 1: Ansichten nach dem Mock bauen:** „Spielen“ überall über `raumMitQuizEroeffnen`, auch „Spielraum eröffnen“ im Editor eines gespeicherten Quiz (erst speichern, dann über die ID). Kopieren und Vorlage öffnen danach die Kopie im Editor. Bei `quiz-unbekannt` in der Sammlung: Meldung zeigen und die erste Seite neu laden (Prüf-Schwerpunkt 2).
- [ ] **Schritt 2: Im Browser durchspielen** (`npm run dev`), vor allem Prüf-Schwerpunkt 2 mit zwei Browserfenstern.
- [ ] **Schritt 3: `npm run check`, Commit** `Add views for the public collection`.

### Aufgabe 9: Datenschutz, Betrieb und Browser-Durchlauf

**Dateien:** Ändern `src/ansichten/Datenschutz.svelte`, `src/ansichten/Konto.svelte`, `docs/Betrieb.md`, `browser/durchlauf.spec.ts`

- [ ] **Schritt 1: Texte ergänzen:** Datenschutz: Öffentliche Quizze sieht jeder ohne Ersteller, Kopien anderer bleiben beim Löschen des Quiz oder Kontos bestehen. Konto löschen: Hinweis, dass Kopien anderer bleiben. `docs/Betrieb.md`: Abfrage, die alle öffentlichen Quizze mit Titel und Besitzer zeigt, und dass `npm run quiz-loeschen` auch für öffentliche gilt.
- [ ] **Schritt 2: Durchlauf erweitern:** veröffentlichen, in der Sammlung sehen (zweiter Browser-Kontext ohne Konto), dort spielen, mit zweitem Konto kopieren, Original privat stellen → Kopieren meldet „gibt es nicht mehr“, Beispiel-Quiz als Vorlage. `npm run test:browser`, erwartet alle PASS.
- [ ] **Schritt 3: `npm run check`, Commit** `Document public quizzes and extend browser run`.

### Aufgabe 10: Doku und Prüfungen

**Dateien:** Neu `docs/adr/0008-spielraum-ueber-quiz-id.md`. Ändern `CLAUDE.md` (Struktur: `worker/sammlung.ts`, `src/ansichten/Sammlung.svelte`), `docs/tools/Cloudflare D1.md` (`ALTER TABLE`, Teilindex, Blättern mit Zeiger), `docs/Glossar.md` bei neuen Begriffen

- [ ] **Schritt 1: ADR 0008 schreiben** (Kontext: Review-Fund 9, öffentliche Quizze; Entscheidung: Spielen über die ID; Alternativen: Inhalt schicken, gemischt; Konsequenzen) **und Doku ergänzen,** Commit `Document public quizzes`.
- [ ] **Schritt 2: `/code-review` und `/security-review`:** Funde mit dem Entwickler durchgehen.
- [ ] **Schritt 3: `npm run check` und Agent `plan-pruefer`:** erwartet `STATUS: ERFÜLLT`.
- [ ] **Schritt 4: PR erstellen,** nach grüner CI und Freigabe mergen.

### Aufgabe 11: Veröffentlichen (nach Freigabe des Entwicklers)

- [ ] **Schritt 1: Migration vor dem Hochladen:** `npx wrangler d1 migrations apply quiz-poker --remote`
- [ ] **Schritt 2: Hochladen:** `npm run deploy`, danach `/api/health` antwortet 200.
- [ ] **Schritt 3: Echter Durchlauf mit `npx wrangler tail`:** Test-Konto, Quiz veröffentlichen, Sammlung ohne Konto, spielen, kopieren, Konten löschen. Danach in D1 kein Test-Quiz und kein Test-Konto übrig. CPU-Zeit von `/api/sammlung` und `POST /api/raeume { quizId }` notieren.
- [ ] **Schritt 4: Phase 3 abschließen:** Roadmap abhaken, Plan auf `status: abgeschlossen`, Journal und Übergabe (Regel „Phasenwechsel“).

## Ergebnis der Reviews

**Aufgabe 1, `/code-review` am 2026-11-07:** 9 Funde. Behoben nach Entscheidung des Entwicklers:

1. Raumgrenze von 30 pro Stunde bremst wiederholte Läufe: als Fehler mit Lösung in `docs/tools/Playwright.md`.
2. `afterAll` räumt zuerst auf und schließt dann die Seite.
3. Die Raum-Tests prüfen den sichtbaren Raumcode (`raumcodeSichtbar`).
4. Das Aufräumen löscht nur das Konto dieses Laufs.
5. Fehlermeldungen von `wrangler` beim Aufräumen bleiben sichtbar.
6. `npx vite --strictPort` statt `npm run dev`: Ein belegter Port meldet sich klar.
8. ADR 0007 zu Playwright. Die ADR „Spielraum über die Quiz-ID“ rückt auf 0008.

Nicht behoben: 7 (gemeinsamer `wrangler`-Aufruf mit `scripts/datenbank.ts`, lohnt den Umbau nicht). 9 (Trace bei seriellen Tests) geprüft: Die `trace.zip` entsteht.
