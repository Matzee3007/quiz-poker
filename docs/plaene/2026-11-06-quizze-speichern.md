---
titel: "Plan: Quizze in D1 speichern"
status: aktiv
erstellt: 2026-11-06
tags: [plan, phase-3, quiz-sammlung, d1]
---

# Plan: Quizze in D1 speichern

**Ziel:** Angemeldete Quiz-Master legen bis zu 20 eigene Quizze an, bearbeiten sie, auch unfertig, löschen sie und eröffnen damit einen Spielraum. Wer sein Konto löscht, löscht seine Quizze mit, und der Betreiber kann ein einzelnes Quiz per Befehl löschen.

**Vorgehen:** Erst die Prüfregeln für Entwürfe als reines TypeScript, dann Tabelle und Wege auf dem Server, die Lücke beim Zurücksetzen des Passworts und der Betriebsbefehl, alles testgetrieben. Danach Mock, Oberfläche, Datenschutztext, Prüfungen und Veröffentlichung. Der Editor des Einmal-Quiz wird für gespeicherte Quizze wiederverwendet.

**Technik:** Cloudflare D1, Better Auth 1.7.17 (nur `auth.api.getSession` und ein Hook), Svelte 5, Vitest 4. Keine neue Abhängigkeit.

**Anforderung:** Schritt 3 von Phase 3 in [[projects/quiz-poker/docs/Projektvision|Projektvision]], Abschnitt „Quiz-Sammlung“, [[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]], [[projects/quiz-poker/docs/Nächste Session|Übergabe]] vom 2026-11-05.

**Umfang:** Nur private Quizze. Öffentliche Quizze, Kopien (auch das Beispiel-Quiz als Vorlage) und die Sammlung für alle kommen mit Schritt 4. Deshalb gibt es noch keine Spalte für „öffentlich“.

**Entscheidungen, die der Plan trifft** (beim Lesen prüfen):

- **Spielen schickt den Inhalt:** Ein gespeichertes Quiz eröffnet den Spielraum über den vorhandenen Weg `POST /api/raeume { quiz }`, wie ein Einmal-Quiz. Damit kopiert der Spielraum das Quiz wie verlangt, und der Server braucht keinen neuen Weg. Vorher speichert der Editor ungespeicherte Änderungen.
- **Speichern per Knopf,** nicht automatisch: weniger Anfragen an D1 und kein halbes Quiz bei einem Netzfehler. Wer mit ungespeicherten Änderungen den Editor verlässt, bekommt eine Rückfrage.
- **Fremde Quizze antworten 404, nicht 403:** Wer eine fremde ID probiert, erfährt nicht, ob es sie gibt.
- **Anmeldungen beim Zurücksetzen:** Der Entwickler hat am 2026-11-06 entschieden, den Audit-Fund zu beheben (Aufgabe 4).

## Feste Vorgaben

- Grenzen aus der Projektvision, auch für unfertige Quizze: höchstens 10 Kategorien, 10 Fragen je Kategorie, 100 Zeichen Titel, 50 Zeichen Kategoriename, 300 Zeichen je Frage, 100 Zeichen je Musterlösung (`QUIZ_GRENZEN`), höchstens 20 gespeicherte Quizze je Konto.
- Unfertig heißt: leere Felder, Kategorien ohne Fragen und Quizze ohne Kategorien sind beim Speichern erlaubt, zum Spielen gilt weiter `quizPruefen`.
- Der Inhalt liegt als JSON in einer Spalte (ADR 0002), neu aufgebaut durch `quizFormLesen`, damit fremde Felder nicht in D1 landen.
- Jede Anfrage an `/api/quizze` prüft die Sitzung auf dem Server über `auth.api.getSession`. Ein Quiz liest, ändert oder löscht nur sein Besitzer, die SQL-Abfrage enthält dafür immer `besitzer = ?`.
- Ändernde Anfragen (`POST`, `PUT`, `DELETE`) brauchen den eigenen `Origin`, sonst 403 `fremde-herkunft`. Anfragen über 256 KiB → 413 `anfrage-zu-gross`.
- Spielraum und Einmal-Quiz funktionieren weiter ohne Konto, die vorhandenen Tests bleiben unverändert grün.
- Der PR bekommt `/code-review` und `/security-review`. Vor jedem Commit `npm run check`. Vitest bleibt bei Version 4. Oberfläche auf Deutsch, Stil C, PC-Breite.

## Schnittstelle zwischen Gerät und Server

```text
GET    /api/quizze        → 200 [{ id, titel, spielbar, geaendertAm }] neueste zuerst | 401 nicht-angemeldet
POST   /api/quizze  { quiz } → 201 { id } | 401 | 409 zu-viele-quizze | 422 ungueltige-nachricht, zu-viele-kategorien, zu-viele-fragen, text-zu-lang
GET    /api/quizze/:id    → 200 { id, quiz, spielbar, geaendertAm } | 401 | 404 quiz-unbekannt
PUT    /api/quizze/:id { quiz } → 200 { geaendertAm } | 401 | 404 | 422 wie bei POST
DELETE /api/quizze/:id    → 204 | 401 | 404
```

Ändernde Anfragen zusätzlich 403 `fremde-herkunft` und 413 `anfrage-zu-gross`. Andere Methoden → 405.

## Prüf-Schwerpunkte

1. Ein angemeldetes Konto ruft ein fremdes Quiz per ID ab, ändert oder löscht es: 404, das Quiz bleibt unverändert (Aufgabe 3).
2. Zwei gleichzeitige Anfragen legen bei 19 Quizzen je ein Quiz an: genau eine gelingt, danach 409 `zu-viele-quizze` (Aufgabe 2).
3. Ein unfertiges Quiz mit leeren Feldern wird gespeichert, eines mit 301 Zeichen in einer Frage oder einem fremden Feld `besitzer` im JSON nicht bzw. ohne das Feld (Aufgaben 1 und 2).
4. Wer sein Konto löscht, verliert alle seine Quizze, ein anderes Konto behält seine (Aufgabe 3).
5. Die Anmeldung läuft ab, während jemand im Editor schreibt: Speichern meldet `sitzung-abgelaufen`, der Inhalt bleibt im Editor stehen (Aufgabe 8, Browser-Durchlauf).

## Aufgaben

### Aufgabe 1: Prüfregeln für Entwürfe

**Dateien:** Ändern `src/regeln/quizpruefung.ts`, `src/regeln/quizpruefung.test.ts`

**Schnittstellen:**

- Liefert: `entwurfPruefen(daten: unknown): QuizPruefung`. Wie `quizPruefen`, gekürzt und neu aufgebaut, aber nur mit den Codes `ungueltige-nachricht`, `zu-viele-kategorien`, `zu-viele-fragen`, `text-zu-lang`. `quizPruefen` behält sein Verhalten.

- [x] **Schritt 1: Fehlschlagende Tests schreiben:**
  - leerer Titel, leere Frage, Kategorie ohne Fragen und `kategorien: []` → `ok: true`
  - 11 Kategorien → `zu-viele-kategorien`, 11 Fragen → `zu-viele-fragen`, 301 Zeichen Frage → `text-zu-lang`
  - fremdes Feld `besitzer` im Quiz → `ok: true`, das Ergebnis enthält es nicht
  - `null` oder `titel: 5` → `ungueltige-nachricht`
- [x] **Schritt 2: Tests laufen lassen:** `npx vitest run src/regeln/quizpruefung.test.ts`, erwartet FAIL mit `entwurfPruefen is not a function`.
- [x] **Schritt 3: `entwurfPruefen` schreiben:** `verstoss` in zwei Funktionen teilen, Grenzen und Vollständigkeit. `quizPruefen` ruft beide in der bisherigen Reihenfolge auf.
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS, auch die bisherigen Tests.
- [x] **Schritt 5: `npm run check`, Commit** `Add draft validation for saved quizzes`.

### Aufgabe 2: Tabelle, Quiz anlegen und Liste

**Dateien:** Neu `migrations/0002_quizze.sql`, `worker/anfrage.ts`, `worker/quizze.ts`, `worker/quizze.test.ts`. Ändern `worker/konto.ts` (nutzt `worker/anfrage.ts`), `worker/index.ts`, `worker/testhilfen.ts`

**Schnittstellen:**

- Nutzt: `entwurfPruefen`, `quizPruefen`, `auth`, `kontoAnlegen` aus `worker/testhilfen.ts`
- Liefert:
  - Tabelle:

    ```sql
    CREATE TABLE quiz (
      id TEXT PRIMARY KEY,
      besitzer TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      inhalt TEXT NOT NULL,
      spielbar INTEGER NOT NULL,
      geaendert_am INTEGER NOT NULL
    );
    CREATE INDEX quiz_besitzer_idx ON quiz (besitzer, geaendert_am);
    ```

  - `worker/anfrage.ts`: `fehler(status: number, code: string): Response` und `eingabeLesen(anfrage: Request, env: Env, hoechstgroesse: number): Promise<Record<string, unknown> | Response>`, aus `worker/konto.ts` verschoben, die 4 KiB werden dort zum Argument.
  - `worker/quizze.ts`: `QUIZ_HOECHSTANZAHL = 20`, `quizAnfrage(anfrage: Request, env: Env, id: string | null): Promise<Response>`. `worker/index.ts` leitet `/api/quizze` mit `id = null` und `/api/quizze/<id>` dorthin.
  - `worker/testhilfen.ts`: `anQuizze(cookie: string, methode: string, pfad?: string, daten?: unknown): Promise<Response>` mit eigenem `Origin`.

- [x] **Schritt 1: Fehlschlagende Tests schreiben:**
  - ohne Cookie: `GET` und `POST` → 401 `nicht-angemeldet`
  - `POST` mit unfertigem Quiz → 201 mit `id`, danach in der Liste mit `titel`, `spielbar: false`
  - `POST` mit dem Beispiel-Quiz → in der Liste `spielbar: true`
  - Liste: neueste zuerst, die Quizze eines anderen Kontos fehlen
  - 20 Quizze anlegen, das 21. → 409 `zu-viele-quizze`
  - bei 19 Quizzen zwei gleichzeitige `POST` (`Promise.all`) → genau einmal 201, danach 20 Zeilen
  - 301 Zeichen in einer Frage → 422 `text-zu-lang`, fremdes Feld `besitzer` → steht danach nicht in `inhalt`
  - fremder `Origin` → 403 `fremde-herkunft`, über 256 KiB → 413, kaputtes JSON → 422
  - `PATCH /api/quizze` → 405
- [x] **Schritt 2: Tests laufen lassen:** `npx vitest run worker/quizze.test.ts`, erwartet FAIL.
- [x] **Schritt 3: Migration, `worker/anfrage.ts` und `quizAnfrage` schreiben:** Sitzung mit `auth.api.getSession({ headers: anfrage.headers })`. Anlegen in einem einzigen Befehl, damit zwei gleichzeitige Anfragen die Grenze nicht überschreiten: `INSERT INTO quiz (…) SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM quiz WHERE besitzer = ?) < 20`, `meta.changes === 0` heißt 409. ID aus `crypto.randomUUID()`, `spielbar` aus `quizPruefen(quiz).ok`. Die Liste liest den Titel mit `json_extract(inhalt, '$.titel')`.
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS, `worker/konto.test.ts` weiter grün.
- [x] **Schritt 5: `npm run check`, Commit** `Add quiz table with create and list`.

### Aufgabe 3: Quiz lesen, ändern, löschen

**Dateien:** Ändern `worker/quizze.ts`, `worker/quizze.test.ts`

**Schnittstellen:** Nutzt alles aus Aufgabe 2. Eine ID passt zum Muster `^[0-9a-f-]{36}$`, sonst 404 ohne Abfrage.

- [x] **Schritt 1: Fehlschlagende Tests schreiben:**
  - `GET` des eigenen Quiz → 200, `quiz` gleicht dem gespeicherten
  - `PUT` mit geändertem Titel → 200, `GET` zeigt den neuen Titel, `geaendertAm` ist gewachsen, aus einem unfertigen wird mit vollständigem Inhalt `spielbar: true`
  - `DELETE` → 204, danach `GET` → 404 `quiz-unbekannt`, die Liste ist um eins kürzer
  - fremdes Konto: `GET`, `PUT`, `DELETE` → 404, das Quiz ist danach unverändert
  - unbekannte ID und `abc` → 404
  - Konto über `/api/auth/delete-user` löschen → seine Quizze sind aus der Tabelle verschwunden, die eines anderen Kontos nicht
- [x] **Schritt 2: Tests laufen lassen:** erwartet FAIL.
- [x] **Schritt 3: Lesen, Ändern und Löschen schreiben:** jede Abfrage mit `WHERE id = ? AND besitzer = ?`, `meta.changes === 0` heißt 404. Das Löschen mit dem Konto übernimmt `ON DELETE CASCADE`. Schlägt dieser Test fehl, weil D1 die Fremdschlüssel nicht durchsetzt, die Quizze in `beforeDelete` in `worker/auth.ts` löschen.
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [x] **Schritt 5: `npm run check`, Commit** `Add reading, updating and deleting saved quizzes`.

### Aufgabe 4: Keine Anmeldung überlebt das Zurücksetzen

Der Audit-Fund `in-flight-sign-in-survives-session-revocation`: Better Auth prüft das alte Passwort, wartet auf den Passwortrechner und legt die Sitzung danach an. Löst in dieser Lücke jemand einen Passwort-Link ein, entsteht die Sitzung nach dem Löschen aller Sitzungen. Die Prüfung danach schließt das.

**Dateien:** Ändern `worker/auth.ts`, `worker/auth.test.ts`

**Schnittstellen:**

- Liefert: `anmeldungBestaetigen(env: Env, sitzungToken: string, userId: string, passwort: string): Promise<boolean>` in `worker/auth.ts`. Prüft das Passwort gegen den aktuellen Hash in `account`. Passt es nicht mehr, löscht es die Sitzung und gibt `false` zurück.

- [x] **Schritt 1: Fehlschlagende Tests schreiben:**
  - Konto anmelden, dann das Passwort in `account` direkt auf einen neuen Hash setzen, dann `anmeldungBestaetigen` mit dem alten Passwort → `false`, die Sitzung ist aus `session` verschwunden
  - mit dem aktuellen Passwort → `true`, die Sitzung bleibt
  - normale Anmeldung über `/api/auth/sign-in/email` → weiter 200 mit Cookie (der Hook stört nicht)
- [x] **Schritt 2: Tests laufen lassen:** erwartet FAIL.
- [x] **Schritt 3: Funktion schreiben und in `hooks.after` für `/sign-in/email` aufrufen:** Sitzung aus `ctx.context.newSession`, Passwort aus `ctx.body.password`. Bei `false` `APIError("UNAUTHORIZED")` mit Code `INVALID_EMAIL_OR_PASSWORD`, so sieht der Angreifer dieselbe Antwort wie bei einem falschen Passwort. Kostet je Anmeldung ein zweites Hashing im Durable Object (gemessen bis 93 ms).
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS, auch `worker/konto.test.ts` und die Grenze von 10 Anmeldungen pro Minute.
- [x] **Schritt 5: `npm run check`, Commit** `Revoke sign-ins that race a password reset`.

### Aufgabe 5: Betreiber löscht ein Quiz

**Dateien:** Neu `scripts/quiz-loeschen.ts`. Ändern `worker/betrieb.ts`, `worker/betrieb.test.ts`, `scripts/datenbank.ts`, `package.json`, `docs/Betrieb.md`

**Schnittstellen:**

- Nutzt: `sqlText` in `worker/betrieb.ts`, `sqlAusfuehren`
- Liefert: `quizLoeschenSql(id: string): string`, Befehl `npm run quiz-loeschen -- <id>`

- [x] **Schritt 1: Fehlschlagende Tests schreiben:** Das SQL läuft gegen die Test-D1 und löscht genau das Quiz mit dieser ID. Die ID `x' OR '1'='1` löscht nichts.
- [x] **Schritt 2: Tests laufen lassen:** `npx vitest run worker/betrieb.test.ts`, erwartet FAIL.
- [x] **Schritt 3: Funktion und Skript schreiben:** Das Skript lehnt eine ID ab, die nicht zum Muster aus Aufgabe 3 passt. `scripts/datenbank.ts` bricht bei jedem unbekannten Argument mit `--` ab, bevor es etwas ausführt: Ein vertipptes `--local` löscht sonst ein echtes Quiz (Hinweis aus dem Audit).
- [x] **Schritt 4: Tests laufen lassen und lokal ausprobieren:** `npm run quiz-loeschen -- --lokal <id>` und `npm run einladung -- --local` (muss abbrechen).
- [x] **Schritt 5: `docs/Betrieb.md` ergänzen:** Abschnitt „Quiz löschen“ mit dem Befehl und der Abfrage, die die IDs eines Kontos zeigt:

  ```bash
  npx wrangler d1 execute quiz-poker --remote --command "SELECT id, json_extract(inhalt, '$.titel') FROM quiz WHERE besitzer = (SELECT id FROM \"user\" WHERE email = 'freund@beispiel.de')"
  ```

- [x] **Schritt 6: `npm run check`, Commit** `Add operator command to delete a quiz`.

### Aufgabe 6: Mock (Entwickler)

- [x] **Schritt 1: Mock mit dem Agent `mock-bauer` bauen:** Liste „Meine Quizze“ (Titel, spielbar oder unfertig, geändert am, Bearbeiten, Spielen, Löschen, Zähler „x von 20“, „Neues Quiz“), der Editor für ein gespeichertes Quiz (Speichern, Stand „gespeichert“ oder „ungespeicherte Änderungen“, Spielraum eröffnen) und der Weg dorthin von Start und Konto. Stil C, Ablage `docs/mocks/2026-11-06-quizze.html`.
- [x] **Schritt 2: Freigabe des Entwicklers abwarten.** Ohne Freigabe keine Aufgabe 8.

**Freigabe (2026-11-06):** Startseite A (dritter Weg in „Spielraum eröffnen“), Liste B (Karten), Editor A (Leiste unten). Dazu: „Eigenes Quiz erstellen“ heißt für Angemeldete „Einmal-Quiz erstellen“, die Meldung bei abgelaufener Anmeldung verlinkt `/anmelden` in einem neuen Tab, Datum relativ („heute, 21:14“, „gestern, 22:05“, sonst „2. Nov. 2026“), die Konto-Seite zeigt „x von 20“.

### Aufgabe 7: Anfragen der Oberfläche

**Dateien:** Neu `src/quizSammlung.ts`, `src/quizSammlung.test.ts`. Ändern `src/meldungen.ts`

**Schnittstellen:**

- Liefert:

  ```ts
  type QuizEintrag = { id: string; titel: string; spielbar: boolean; geaendertAm: number };
  type Ergebnis<T> = { ok: true; wert: T } | { ok: false; code: string };
  quizzeLaden(): Promise<Ergebnis<QuizEintrag[]>>
  quizLaden(id: string): Promise<Ergebnis<Quiz>>
  quizAnlegen(quiz: Quiz): Promise<Ergebnis<string>>        // die neue ID
  quizSpeichern(id: string, quiz: Quiz): Promise<Ergebnis<number>>  // geaendertAm
  quizLoeschen(id: string): Promise<Ergebnis<null>>
  ```

  Plain `fetch` wie in `src/konto.ts`, Fehlercodes über `fehlercodeLesen`.

- [x] **Schritt 1: Fehlschlagende Tests schreiben (mit nachgebautem `fetch` wie in `src/konto.test.ts`):** 401 → `sitzung-abgelaufen`, 404 → `quiz-unbekannt`, 409 → `zu-viele-quizze`, Netzfehler → `keine-verbindung`, Erfolg liefert den Wert. Jeder neue Code hat eine Meldung, `anfrage-zu-gross` heißt weiter „Das Quiz ist zu groß“.
- [x] **Schritt 2: Tests laufen lassen:** `npx vitest run src/quizSammlung.test.ts`, erwartet FAIL.
- [x] **Schritt 3: `src/quizSammlung.ts` und Meldungen schreiben.**
- [x] **Schritt 4: Tests laufen lassen:** erwartet PASS.
- [x] **Schritt 5: `npm run check`, Commit** `Add client requests for saved quizzes`.

### Aufgabe 8: Ansichten

**Dateien:** Neu `src/ansichten/Quizze.svelte`. Ändern `src/App.svelte`, `src/ansichten/QuizEditor.svelte`, `src/ansichten/Konto.svelte`, `src/ansichten/Start.svelte`

**Schnittstellen:**

- Nutzt: `src/quizSammlung.ts`
- Liefert: Pfade `/quizze` (Liste, nur angemeldet, sonst weiter zu `/anmelden` wie bei `/konto`) und `/quiz/<id>` (Editor). `QuizEditor` bekommt die Prop `gespeichert: { id: string; quiz: Quiz } | null`. Bei `null` bleibt alles wie heute (Entwurf im `localStorage`, Löschen beim Eröffnen). Sonst kein `localStorage`, ein Knopf „Speichern“, und „Spielraum eröffnen“ speichert zuerst.

- [x] **Schritt 1: Ansichten nach dem Mock bauen.** „Neues Quiz“ legt sofort ein leeres Quiz (`leererEntwurf()`) an und öffnet es. Löschen fragt per `confirm` nach. Ungespeicherte Änderungen: Rückfrage beim Verlassen über die eigenen Knöpfe und `beforeunload`. Bei `sitzung-abgelaufen` bleibt der Inhalt im Editor, die Meldung nennt das Anmelden in einem neuen Tab.
- [x] **Schritt 2: Im Browser durchspielen:** `npm run dev`, mit einem lokalen Konto (`npm run einladung -- --lokal`): Quiz anlegen, unfertig speichern, neu laden, fertig schreiben, spielen bis zum Ende, Quiz während der Partie ändern (die Partie bleibt gleich), löschen, 20er-Grenze, Abmelden in einem zweiten Tab und dann Speichern (Prüf-Schwerpunkt 5). Danach Einmal-Quiz und Beispiel-Quiz ohne Konto.
- [x] **Schritt 3: `npm run check`, Commit** `Add views for saved quizzes`.

### Aufgabe 9: Datenschutz und Konto-Texte

**Dateien:** Ändern `src/ansichten/Datenschutz.svelte`, `src/ansichten/Konto.svelte`

- [x] **Schritt 1: Texte ergänzen:** Datenschutz, Abschnitt „Mit Konto“: Gespeicherte Quizze liegen mit dem Konto in der Datenbank, nur der Besitzer sieht sie, sie verschwinden sofort beim Löschen des Quiz oder des Kontos, und der Betreiber kann einzelne Quizze löschen. Konto löschen: „Entfernt deine Adresse, dein Passwort und deine Quizze.“ Der Satz „Das Speichern von Quizzen kommt später.“ entfällt.
- [x] **Schritt 2: `npm run check`, Commit** `Mention saved quizzes in privacy notice`.

### Aufgabe 10: Doku und Prüfungen

**Dateien:** Ändern `CLAUDE.md` (Struktur: `worker/quizze.ts`, `worker/anfrage.ts`, `src/quizSammlung.ts`, Befehl `quiz-loeschen`), `docs/tools/Cloudflare D1.md` (Fremdschlüssel, `json_extract`, Grenze in einem `INSERT`), `docs/Glossar.md` bei neuen Begriffen

- [x] **Schritt 1: Doku ergänzen und committen:** Commit `Document saved quizzes`.
- [ ] **Schritt 2: `/code-review` und `/security-review`:** Funde mit dem Entwickler durchgehen.
- [ ] **Schritt 3: `npm run check` und Agent `plan-pruefer`:** erwartet `STATUS: ERFÜLLT`.
- [ ] **Schritt 4: PR erstellen,** nach grüner CI und Freigabe des Entwicklers mergen.

### Aufgabe 11: Veröffentlichen (nach Freigabe des Entwicklers)

- [ ] **Schritt 1: Migration, immer vor dem Hochladen:** `npx wrangler d1 migrations apply quiz-poker --remote`
- [ ] **Schritt 2: Hochladen:** `npm run deploy`, danach `/api/health` antwortet 200.
- [ ] **Schritt 3: Echter Durchlauf mit `npx wrangler tail`:** Test-Konto per Einladung, Quiz anlegen, speichern, spielen, löschen, Konto löschen. Danach in D1 kein Quiz und kein Konto übrig. CPU-Zeit je Anfrage an `/api/quizze` notieren: Die Sitzungsabfrage lag bei den Konten schon bei bis zu 16 ms, über 10 ms ist der bekannte Grenzfall aus ADR 0005.
- [ ] **Schritt 4: Abschluss:** Roadmap in der Projektvision ergänzen, Plan auf `status: abgeschlossen`, Journal und Übergabe.
