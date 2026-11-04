---
titel: "Plan: Editor und Einmal-Quiz"
status: aktiv
erstellt: 2026-11-04
tags: [plan, phase-3, editor, svelte, durable-objects]
---

# Plan: Editor und Einmal-Quiz

**Ziel:** Wer die Seite öffnet, erstellt ohne Konto ein eigenes Quiz im Browser und spielt es in einem Spielraum, oder wählt wie bisher das Beispiel-Quiz.

**Vorgehen:** Erst die Prüfregeln als reines TypeScript, dann der Server, zuletzt Mock und Oberfläche. Browser und Server nutzen dieselbe Prüfung, entscheidend ist die auf dem Server. Der Spielraum speichert seine Kopie im vorhandenen Stand, D1 und Konten kommen hier nicht vor.

**Technik:** Svelte 5, Cloudflare Durable Objects, Vitest 4. Keine neuen Abhängigkeiten.

**Anforderung:** Schritt 1 von Phase 3 in [[projects/quiz-poker/docs/Projektvision|Projektvision]], Abschnitt „Quiz-Sammlung“, [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]].

**Umfang:** Nur Schritt 1. Konten, Speichern in D1 und öffentliche Quizze bekommen je einen eigenen Plan, weil jeder Schritt für sich läuft und der Test zum Passwort-Hashing den Plan für Schritt 2 noch verändern kann.

## Feste Vorgaben

- Grenzen: höchstens 10 Kategorien, 10 Fragen je Kategorie, 300 Zeichen je Frage, 100 Zeichen je Musterlösung (Projektvision).
- Neu in diesem Plan, zusätzlich zur Klärung: Titel höchstens 100 Zeichen, Kategoriename höchstens 50 Zeichen, Anfrage höchstens 256 KiB.
- Zum Spielen braucht ein Quiz mindestens eine Kategorie, je Kategorie mindestens eine Frage und keine leeren Felder. Felder nur aus Leerzeichen gelten als leer.
- Der Server übernimmt nur die bekannten Felder und speichert sie ohne Leerzeichen am Rand.
- Der Spielraum kopiert das Quiz beim Öffnen. Lösungen verlassen den Server weiter nur über `spielerAnsicht` und `quizMasterAnsicht`.
- Eine abgelehnte Anfrage zählt nicht gegen die 30 neuen Spielräume pro Stunde.
- Der Entwurf liegt nur im `localStorage` und wird nach dem erfolgreichen Öffnen des Spielraums gelöscht.
- Sortieren mit Knöpfen hoch und runter, ohne Ziehen. Oberfläche auf Deutsch mit den Begriffen aus dem Glossar, Stil C, PC-Breite wie bisher.
- Vor jedem Commit `npm run check`. Vitest bleibt bei Version 4.

## Schnittstelle zwischen Gerät und Server

```text
POST /api/raeume                 → Beispiel-Quiz, wie bisher: 201 { raumcode, token } | 429 { code: "zu-viele-raeume" }
POST /api/raeume { quiz }        → Einmal-Quiz: 201 { raumcode, token } | 429 | 422 { code } | 413 { code: "anfrage-zu-gross" }
```

`code` bei 422: `ungueltige-nachricht`, `leeres-quiz`, `leeres-feld`, `zu-viele-kategorien`, `zu-viele-fragen`, `text-zu-lang`.

## Prüf-Schwerpunkte

1. Ein Spieler liest die Nachrichten mit: Auch beim Einmal-Quiz steht die Musterlösung vor der Auflösung nicht darin (Aufgabe 2).
2. Jemand schickt die Anfrage an der Oberfläche vorbei, zu groß oder mit fremden Feldern: 422 oder 413, fremde Felder werden nicht gespeichert (Aufgaben 1 und 2).
3. Der Browser wird im Editor neu geladen oder der Speicher enthält Kaputtes: Der Entwurf bleibt erhalten oder der Editor startet leer, statt abzustürzen (Aufgabe 4).
4. Das Öffnen des Spielraums scheitert, zum Beispiel ohne Netz oder wegen der Raumgrenze: Der Entwurf bleibt erhalten, und eine Meldung erscheint (Aufgabe 5).
5. Ein Quiz mit nur einer Frage und eines an allen Grenzen laufen bis zum Ende durch (Aufgabe 2).

## Aufgaben

### Aufgabe 0: Klärung sichern

- [x] **Schritt 1: Doku-PR**: Die Änderungen aus der Klärung (Glossar, ADRs, Projektvision, `Tools für später`, `CLAUDE.md`) auf `docs/phase-3-klaerung` committen, PR erstellen und nach grüner CI mergen. Reine Doku, kein `/code-review`. Dieser Plan bleibt dabei uncommittet.
- [x] **Schritt 2: Branch**: Von aktuellem `main` den Branch `feat/einmal-quiz` anlegen, dieser Plan kommt dort mit in den PR.

### Aufgabe 1: Quiz prüfen

**Dateien:** Neu `src/regeln/quizpruefung.ts`, `src/regeln/quizpruefung.test.ts`

**Schnittstellen:**

- Nutzt: `Quiz` aus `src/regeln/partie.ts`
- Liefert: `type QuizFehlerCode = "ungueltige-nachricht" | "leeres-quiz" | "leeres-feld" | "zu-viele-kategorien" | "zu-viele-fragen" | "text-zu-lang"`, `type QuizPruefung = { ok: true; quiz: Quiz } | { ok: false; code: QuizFehlerCode }`, `quizPruefen(daten: unknown): QuizPruefung`, Konstanten `QUIZ_GRENZEN = { kategorien: 10, fragenJeKategorie: 10, titel: 100, kategorieName: 50, frage: 300, musterloesung: 100 }`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**

```ts
const frage = { text: "F", musterloesung: "L" };
const quiz = (kategorien: unknown) => ({ titel: "T", kategorien });

it("nimmt ein Quiz genau an den Grenzen an", () => {
  const fragen = Array(10).fill({ text: "f".repeat(300), musterloesung: "l".repeat(100) });
  const kategorien = Array(10).fill({ name: "k".repeat(50), fragen });
  expect(quizPruefen({ titel: "t".repeat(100), kategorien }).ok).toBe(true);
});
it("lehnt je ein Zeichen oder Element über der Grenze ab", () => {
  // 301 Zeichen Frage, 101 Musterlösung, 101 Titel, 51 Kategoriename → "text-zu-lang"
  // 11 Kategorien → "zu-viele-kategorien", 11 Fragen → "zu-viele-fragen"
});
it("lehnt leere und nur aus Leerzeichen bestehende Felder ab", () => {
  expect(quizPruefen(quiz([{ name: "  ", fragen: [frage] }]))).toEqual({ ok: false, code: "leeres-feld" });
  // ebenso Titel, Fragetext und Musterlösung
});
it("lehnt ein Quiz ohne Kategorie oder eine Kategorie ohne Frage ab", () => {
  expect(quizPruefen(quiz([]))).toEqual({ ok: false, code: "leeres-quiz" });
  expect(quizPruefen(quiz([{ name: "K", fragen: [] }]))).toEqual({ ok: false, code: "leeres-quiz" });
});
it("lehnt falsche Typen ab", () => {
  // null, "x", { titel: 1, kategorien: [] }, kategorien kein Array, Frage ohne text → "ungueltige-nachricht"
});
it("kürzt Leerzeichen am Rand und übernimmt nur bekannte Felder", () => {
  const ergebnis = quizPruefen({ titel: " T ", kategorien: [{ name: " K ", fremd: 1, fragen: [{ text: " F ", musterloesung: " L ", fremd: 2 }] }], fremd: 3 });
  expect(ergebnis).toEqual({ ok: true, quiz: { titel: "T", kategorien: [{ name: "K", fragen: [frage] }] } });
});
it("nimmt das Beispiel-Quiz an", () => {
  expect(quizPruefen(BEISPIEL_QUIZ).ok).toBe(true);
});
```

- [x] **Schritt 2: Tests laufen lassen**: `npx vitest run src/regeln/quizpruefung.test.ts`, erwartet: FAIL, Modul fehlt.
- [x] **Schritt 3: `quizPruefen` schreiben**: Prüft zuerst die Typen, dann die Anzahl, dann leere Felder, dann die Längen nach dem Kürzen. Baut das Ergebnis neu auf.
- [x] **Schritt 4: Tests laufen lassen**: gleicher Befehl, erwartet: PASS.
- [x] **Schritt 5: Prüfen und committen**: `npm run check`, dann `git commit -m "Add quiz validation"`.

### Aufgabe 2: Spielraum mit Einmal-Quiz öffnen

**Dateien:** Ändern `worker/index.ts`, `worker/spielraum.ts`, `worker/spielraum.test.ts`, `worker/testhilfen.ts`, `src/meldungen.ts`

**Schnittstellen:**

- Nutzt: `quizPruefen`, `QuizFehlerCode` aus Aufgabe 1
- Liefert: `Spielraum.eroeffnen(quiz: Quiz): Promise<string | null>`, die Anfrage aus „Schnittstelle zwischen Gerät und Server“, `raumEroeffnen(quiz?: unknown)` in `worker/testhilfen.ts`

- [x] **Schritt 1: Fehlschlagende Tests schreiben** in `worker/spielraum.test.ts`:
  - `öffnet einen Spielraum mit dem mitgeschickten Quiz`: Quiz-Master-Ansicht zeigt nach dem Start dessen Kategorie und Frage.
  - `verrät dem Spieler die Musterlösung des Einmal-Quiz erst bei der Auflösung`: rohe Nachrichten des Spielers enthalten die Musterlösung in den Phasen `warten`, `einsatz`, `antworten` und `auswertung` nicht, in `aufgeloest` schon.
  - `spielt ein Quiz mit nur einer Frage bis zum Ende`: Phase `beendet` nach `naechste-runde`.
  - `spielt ein Quiz an allen Grenzen`: Eröffnen gibt 201, Speichern und Ansicht funktionieren nach dem Start.
  - `speichert fremde Felder nicht`: Quiz mit Zusatzfeld in einer Frage, keine Nachricht enthält dessen Wert.
  - `antwortet ohne Quiz wie bisher mit dem Beispiel-Quiz`: Kategorie `Geographie`.
  - `lehnt kaputtes JSON mit 422 ungueltige-nachricht ab` und `lehnt ein ungültiges Quiz mit seinem Code ab`.
  - `lehnt eine Anfrage über 256 KiB mit 413 anfrage-zu-gross ab`.
  - `zählt ein ungültiges Quiz nicht gegen die Raumgrenze`: mit `RAEUME_PRO_STUNDE: "0"` wie im vorhandenen Test kommt 422 statt 429.
  - `lehnt ein gültiges Quiz bei voller Raumgrenze mit 429 ab`.
- [x] **Schritt 2: Tests laufen lassen**: `npx vitest run worker/spielraum.test.ts`, erwartet: die neuen Tests schlagen fehl.
- [x] **Schritt 3: Server ändern**: `raumEroeffnen(anfrage, env)` liest den Text, prüft zuerst die Größe, dann JSON und Quiz und erst danach die Raumgrenze. Ein leerer Text bedeutet `BEISPIEL_QUIZ`. Der Import von `BEISPIEL_QUIZ` wandert von `spielraum.ts` nach `index.ts`. In `meldungen.ts` je eine deutsche Meldung für alle Codes aus `QuizFehlerCode` und `anfrage-zu-gross`.
- [x] **Schritt 4: Tests laufen lassen**: `npm test`, erwartet: PASS, auch alle bisherigen.
- [x] **Schritt 5: Prüfen und committen**: `npm run check`, dann `git commit -m "Open rooms with a one-off quiz"`.

### Aufgabe 3: Mock und Freigabe

**Dateien:** Neu `docs/mocks/2026-11-04-editor.html`

- [x] **Schritt 1: Mock bauen** mit dem Agent `mock-bauer`: Startseite mit der Wahl zwischen Beispiel-Quiz und eigenem Quiz, dazu der Editor mit Titel, Kategorien, Fragen, Knöpfen hoch und runter, Zähler an den Grenzen und Fehlermarkierung leerer Felder. Stil C, Varianten für den Aufbau des Editors.
- [x] **Schritt 2: Freigabe**: Der Entwickler wählt eine Variante. Ohne Freigabe beginnen die Aufgaben 4 und 5 nicht. Abweichungen vom Mock in Aufgabe 5 eintragen.
- [x] **Schritt 3: Committen**: `git commit -m "Add editor mock"`.

### Aufgabe 4: Entwurf im Browser

**Dateien:** Neu `src/regeln/quizEntwurf.ts`, `src/regeln/quizEntwurf.test.ts`, `src/entwurfSpeicher.ts`

**Schnittstellen:**

- Nutzt: `Quiz` aus `src/regeln/partie.ts`
- Liefert: `leererEntwurf(): Quiz` (leerer Titel, eine Kategorie mit einer leeren Frage), `entwurfAusText(text: string | null): Quiz`, `verschieben<T>(liste: T[], index: number, richtung: -1 | 1): T[]`, in `src/entwurfSpeicher.ts`: `entwurfLesen(): Quiz`, `entwurfSpeichern(entwurf: Quiz): void`, `entwurfLoeschen(): void` mit dem Schlüssel `quiz-poker:einmal-quiz`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**:
  - `entwurfAusText` liefert bei `null`, kaputtem JSON und falscher Form den `leererEntwurf()`.
  - `entwurfAusText` behält unfertige Entwürfe mit leeren Feldern und liefert nur bekannte Felder.
  - `verschieben` tauscht mit dem Nachbarn, gibt eine neue Liste zurück und lässt sie am Rand unverändert.
- [x] **Schritt 2: Tests laufen lassen**: `npx vitest run src/regeln/quizEntwurf.test.ts`, erwartet: FAIL, Modul fehlt.
- [x] **Schritt 3: Funktionen schreiben**: `entwurfSpeicher.ts` ist nur die dünne Hülle um `localStorage`, ohne eigene Tests, wie die Token-Funktionen in `verbindung.svelte.ts`.
- [x] **Schritt 4: Tests laufen lassen**: gleicher Befehl, erwartet: PASS.
- [x] **Schritt 5: Prüfen und committen**: `npm run check`, dann `git commit -m "Add quiz draft helpers"`.

### Aufgabe 5: Editor und Startseite

**Dateien:** Neu `src/ansichten/QuizEditor.svelte`; Ändern `src/App.svelte`, `src/ansichten/Start.svelte`, `src/stil.css`

**Schnittstellen:**

- Nutzt: `quizPruefen`, `QUIZ_GRENZEN` aus Aufgabe 1, die Anfrage aus Aufgabe 2, `entwurfLesen`, `entwurfSpeichern`, `entwurfLoeschen`, `verschieben` aus Aufgabe 4, `meldungFuer`
- Liefert: Adresse `/quiz-erstellen`, Komponente `QuizEditor` mit den Props `onEintritt(raumcode: string, token: string, rueckkehr: boolean)` und `onZurueck()`

**Freigabe aus dem Mock (2026-11-04):** Variante 2, zwei Spalten, die Leiste mit „Spielraum eröffnen“ bleibt beim Scrollen stehen. Der Hinweis sagt ausdrücklich, dass der Entwurf nach dem Eröffnen gelöscht wird. Die letzte Frage und die letzte Kategorie lassen sich nicht löschen. Rückfrage nur beim Löschen einer Kategorie mit Inhalt. Neue leere Felder werden nicht sofort rot. Jedes Feld zeigt einen Zeichenzähler.

**Abweichungen beim Bau:** Zusätzlich `src/ansichten/EditorFeld.svelte` (das Feld kommt viermal vor) und `src/raumEroeffnen.ts` (Anfrage aus Startseite und Editor). Der Browser-Test fand einen Fehler: Eine lange Musterlösung drückte die Frage in `Aufloesung.svelte` und `QuizMasterRunde.svelte` zu einer schmalen Spalte zusammen, beide nutzen jetzt die Klasse `frage-loesung` mit festen Spalten. „Server gestoppt“ wurde durch eine blockierte Anfrage im Browser nachgestellt. Ebenfalls zusätzlich: `quizFormLesen` aus `quizpruefung.ts` liest auch den Entwurf, `Start` hat die Prop `onEditor`, `raumMitAnnaUndBen` nimmt ein Quiz.

- [x] **Schritt 1: Startseite**: Karte „Spielraum eröffnen“ mit „Beispiel-Quiz spielen“ (wie bisher) und „Eigenes Quiz erstellen“ (führt zu `/quiz-erstellen`).
- [x] **Schritt 2: `App.svelte`**: Bei `/quiz-erstellen` zeigt sie den Editor. Die Zurück-Taste des Browsers führt über `onpopstate` zurück.
- [x] **Schritt 3: `QuizEditor.svelte`**: Bearbeitet einen `$state`-Entwurf aus `entwurfLesen()` und speichert jede Änderung mit `entwurfSpeichern`. Felder mit `maxlength` aus `QUIZ_GRENZEN`, „Hinzufügen“ an der Grenze gesperrt. „Spielraum eröffnen“ ruft `quizPruefen` auf, zeigt bei Fehlern die Meldung und markiert leere Felder, sonst `POST /api/raeume { quiz }`. Bei Erfolg `entwurfLoeschen()` und `onEintritt`, bei Fehler bleibt der Entwurf.
- [x] **Schritt 4: Prüfen**: `npm run check`, erwartet: alles grün.
- [x] **Schritt 5: Im Browser spielen** mit `npm run dev`:
  - Quiz mit 2 Kategorien erstellen, sortieren, neu laden: Der Entwurf ist noch da.
  - Spielraum eröffnen, mit 2 Spielern in weiteren Fenstern bis zum Ende spielen.
  - Leere Felder: Der Knopf zeigt die Meldung und markiert sie.
  - Server gestoppt: Meldung erscheint, der Entwurf bleibt.
  - Langer Text mit 300 Zeichen: Das Layout bleibt in Editor und Runde intakt.
  - Beispiel-Quiz funktioniert wie zuvor.
- [x] **Schritt 6: Committen**: `git commit -m "Add quiz editor and one-off quiz start"`.

### Aufgabe 6: Doku, Prüfung und Veröffentlichung

**Dateien:** Ändern `CLAUDE.md` (Repo-Struktur), `docs/tools/Svelte und Vite.md` falls etwas Neues auftrat, `docs/Projektvision.md` nur bei Abweichungen

- [x] **Schritt 1: Doku ergänzen und committen**: `git commit -m "Document one-off quiz"`.
- [x] **Schritt 2: Agent `plan-pruefer`** prüft den Branch gegen diesen Plan, Funde beheben.
- [x] **Schritt 3: PR und `/code-review`**: Funde mit dem Entwickler durchgehen. Kein `/security-review`, das gilt erst ab den Konten.
- [ ] **Schritt 4: Merge** nach grüner CI (`gh pr checks <nr> --watch`).
- [ ] **Schritt 5: Veröffentlichen** nach Rückfrage beim Entwickler: `npm run deploy`, dann unter `https://quiz-poker.quiz-poker.workers.dev` ein kurzes Einmal-Quiz eröffnen und mit 2 Spielern bis zum Ende spielen.

## Ergebnis des Reviews

Behoben: Sperre während des Eröffnens, Zeilenumbrüche in Fragen, Prüfung von `Content-Length` vor dem Lesen, `rundeNummer` als eindeutiger Schlüssel der Runde, langer Kategoriename im Kopf, doppeltes Lesen des Fehlercodes. Der Titel steht jetzt im Warteraum.

Bewusst offen: Editor in mehreren Tabs (der letzte überschreibt), gesperrter Browser-Speicher, Regel für leere Felder an mehreren Stellen. Fehlt `Content-Length`, liest der Server die Anfrage weiter ganz, bevor er die Größe prüft.

## Danach

Schritt 2 von Phase 3 beginnt mit eigenem Plan und dem Test zum Passwort-Hashing im Durable Object.
