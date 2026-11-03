---
titel: "Plan: Spielraum online"
status: aktiv
erstellt: 2026-11-03
tags: [plan, phase-2, durable-objects, websockets, svelte]
---

# Plan: Spielraum online

**Ziel:** Ein Quiz-Master und bis zu 8 Spieler spielen an ihren PCs eine ganze Partie mit dem Beispiel-Quiz über eine öffentliche Adresse.

**Vorgehen:** Erst der Server mit Tests, dann die Oberfläche. Die neuen Regeln (Ansicht je Rolle, Raumcode, Eingabegrenzen) bleiben reines
TypeScript. Das Durable Object hält nur Verbindungen und Speicher und ruft die Regeln auf. Zwei PRs: Server (Aufgaben 1 bis 7), Oberfläche und
Veröffentlichung (Aufgaben 8 bis 11).

**Technik:** Cloudflare Durable Objects mit Hibernation API, `@cloudflare/vitest-plugin` 1.5 (neue Entwicklungsabhängigkeit, unterstützt
Vitest `^4.1`), Svelte 5.

**Anforderung:** [[projects/quiz-poker/docs/Projektvision|Projektvision]], Abschnitt „Spielraum online“,
[[projects/quiz-poker/docs/adr/0004-spielstand-und-hibernation|ADR 0004]], [[projects/quiz-poker/docs/mocks/2026-11-03-spielraum.html|Mock, Stil C]].

## Feste Vorgaben

- Spieler-IDs und Tokens erzeugt nur der Server mit `crypto.randomUUID()`. Eine Aktion gilt immer für das Token der Verbindung, nie für eine mitgeschickte ID.
- Lösungen und fremde Einsätze verlassen den Server nur über `spielerAnsicht` oder `quizMasterAnsicht`.
- Tokens werden über `Map` oder `Object.hasOwn` gesucht, damit `constructor` als Token nichts findet.
- Der Spielstand steht nach jeder Aktion im Speicher, Variablen des Objekts überleben das Schlafen nicht.
- Raumcode: 4 Zeichen aus `ABCDEFGHJKLMNPQRSTUVWXYZ`. Namen höchstens 20, Antworten höchstens 200 Zeichen. Löschen nach 24 Stunden ohne Aktion.
- Tests mit WebSockets und Durable Objects brauchen laut Cloudflare `maxWorkers: 1` und `isolate: false`. Tests teilen sich damit den Speicher und nutzen je einen eigenen Raumcode.
- Oberfläche auf Deutsch mit den Begriffen aus dem Glossar, PC-Breite ab 1280 px, Stil C aus dem Mock. Keine neuen Abhängigkeiten außer dem Test-Plugin.
- Vitest bleibt bei Version 4, auch wenn das Plugin inzwischen `^5` erlaubt. Ein Update ist eine eigene Aufgabe.
- Vor jedem Commit `npm run check`.

## Schnittstellen zwischen Gerät und Server

```text
POST /api/raeume                        → 201 { raumcode, token }
POST /api/raeume/:code/spieler { name } → 201 { token } | 404 | 409 { code: "name-vergeben" } | 422 { code }
POST /api/raeume/:code/rueckkehr { name } → 202 { token } | 404 | 422 { code: "unbekannter-spieler" }
GET  /api/raeume/:code/verbindung?token=… (WebSocket) → bei falschem Token Schließcode 4001

Gerät → Server: { typ: "partie-starten" | "frage-zeigen" | "auswertung-starten" | "aufloesen" | "naechste-runde" | "raum-schliessen" }
                { typ: "einsatz-setzen", einsatz: number }
                { typ: "antwort-bestaetigen", text: string } | { typ: "antwort-zuruecknehmen" }
                { typ: "antwort-auswerten" | "rueckkehr-bestaetigen" | "rueckkehr-ablehnen" | "spieler-entfernen", spielerId: string, richtig?: boolean }
Server → Gerät: { typ: "ansicht", ansicht } | { typ: "fehler", code } | { typ: "wartet-auf-bestaetigung" }
Schließcodes: 4001 unbekanntes Token, 4002 Raum geschlossen, 4003 ersetzt oder entfernt
```

## Prüf-Schwerpunkte

1. Ein Spieler schickt Aktionen des Quiz-Masters oder liest fremde Einsätze aus der Nachricht: Aktion wirft `keine-berechtigung`, die Nachricht enthält nichts Fremdes (Aufgaben 3 und 6).
2. Das Objekt schläft mitten in der Runde und wird neu aufgebaut: Einsätze und Verbindungen sind danach noch da (Aufgabe 6).
3. Kaputte Nachrichten oder `constructor` als Token: Fehler oder Schließcode, der Stand bleibt unverändert (Aufgaben 4 und 5).
4. Eine neue Verbindung mit demselben Token bei noch offener alter: Die alte wird mit 4003 geschlossen (Aufgabe 5).
5. Ein abgelehnter oder noch nicht bestätigter neuer Gerätezugang sieht nichts vom Spielstand (Aufgabe 7).

## PR 1: Server

### Aufgabe 1: Test-Plugin und Durable Object einrichten

**Dateien:** Ändern `package.json`, `vitest.config.ts`, `wrangler.jsonc`, `tsconfig.worker.json`, `worker/index.ts`, `worker/index.test.ts`; Neu `worker/spielraum.ts`; Ändern `docs/Tools für später.md`, `docs/tools/Cloudflare Workers und Durable Objects.md`, `docs/tools/Vitest, ESLint und Prettier.md`

**Schnittstellen:**

- Liefert: Bindung `env.SPIELRAUM`, Klasse `Spielraum extends DurableObject` in `worker/spielraum.ts`, Export aus `worker/index.ts`

- [x] **Schritt 1: Plugin installieren**: `npm install -D @cloudflare/vitest-plugin`, `allowScripts` bleibt.
- [x] **Schritt 2: `vitest.config.ts`**: `cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })`, `maxWorkers: 1`, `isolate: false`.
- [x] **Schritt 3: Test anpassen und ergänzen, muss rot sein**: Die vorhandenen Tests rufen über `exports.default.fetch` auf. Neu: Test „der Spielraum nimmt eine WebSocket-Verbindung an und antwortet nach dem Schlafen“: `env.SPIELRAUM.getByName("TEST")`, WebSocket öffnen, `evictDurableObject(stub)`, Nachricht senden, Antwort kommt an.
- [x] **Schritt 4: `wrangler.jsonc`**: `durable_objects.bindings` mit `SPIELRAUM` und Migration `new_sqlite_classes: ["Spielraum"]`. `tsconfig.worker.json` bekommt `src/regeln/**/*.ts` und `src/protokoll.ts` im `include`. `Spielraum` nimmt mit `ctx.acceptWebSocket` an und antwortet vorläufig mit `{ typ: "fehler", code: "ungueltige-nachricht" }`.
- [x] **Schritt 5: `npm test`, alles grün, auch `src/regeln`.** Scheitert `isolate: false` oder das Einschlafen im Test, anhalten und den Fund in die Notiz schreiben statt ihn zu umgehen.
- [x] **Schritt 6: Vorgemerktes Tool aus `docs/Tools für später.md` austragen und in den Notizen dokumentieren, `npm run check`, committen:** „Set up durable object testing“

### Aufgabe 2: Raumcode und Eingabegrenzen

**Dateien:** Neu `src/regeln/raumcode.ts`, Test `src/regeln/raumcode.test.ts`; Ändern `src/regeln/fehler.ts`, `src/regeln/partie.ts`, `src/regeln/partie.test.ts`

**Schnittstellen:**

- Liefert: `raumcodeErzeugen(zufall: () => number = Math.random): string`, `istGueltigerRaumcode(code: string): boolean`; neue Codes `name-zu-lang`, `antwort-zu-lang`, `keine-berechtigung`, `ungueltige-nachricht`

- [x] **Schritt 1: Tests schreiben, rot**: `raumcodeErzeugen(() => 0)` ist `"AAAA"`, `raumcodeErzeugen(() => 0.999)` ist `"ZZZZ"`. `istGueltigerRaumcode` lehnt `"ABC"`, `"ABCDE"`, `"abcd"`, `"OABC"`, `"IABC"`, `"constructor"` ab. Name mit 20 Zeichen geht, mit 21 wirft `name-zu-lang`. Antwort mit 200 Zeichen geht, mit 201 wirft `antwort-zu-lang`, jeweils nach dem Trimmen.
- [x] **Schritt 2: Umsetzen, `npm test -- src/regeln`, grün.**
- [x] **Schritt 3: `npm run check`, committen:** „Add room codes and input limits“

### Aufgabe 3: Ansicht je Rolle

**Dateien:** Neu `src/regeln/ansicht.ts`, Test `src/regeln/ansicht.test.ts`

**Schnittstellen:**

- Nutzt: `Partie`, `aktuelleRunde`, `sieger`
- Liefert:

```ts
interface SpielerZeile {
  id: string; name: string; chips: number; verbunden: boolean; spieltMit: boolean;
  hatGesetzt: boolean; istBereit: boolean;
  einsatz: number | null; antwort: string | null; richtig: boolean | null;
}
interface GemeinsameAnsicht {
  phase: Phase; kategorie: string | null; rundeInKategorie: number; rundenInKategorie: number;
  frage: string | null; musterloesung: string | null; spieler: SpielerZeile[]; sieger: string[];
}
interface SpielerAnsicht extends GemeinsameAnsicht { rolle: "spieler"; ichId: string }
interface QuizMasterAnsicht extends GemeinsameAnsicht { rolle: "quiz-master"; rueckkehrAnfragen: { spielerId: string; name: string }[] }
function spielerAnsicht(partie: Partie, spielerId: string, verbundeneIds: string[]): SpielerAnsicht;
function quizMasterAnsicht(partie: Partie, verbundeneIds: string[], rueckkehrAnfragen: { spielerId: string; name: string }[]): QuizMasterAnsicht;
```

- [x] **Schritt 1: Tests schreiben, rot**
  - Spieler in `warten`: `kategorie`, `frage`, `musterloesung` sind `null`.
  - Spieler in `einsatz`: `kategorie` gesetzt, `frage` und `musterloesung` `null`, `rundeInKategorie` 1 von 2. Fremder `einsatz` ist `null`, `hatGesetzt` stimmt, eigener Einsatz ist sichtbar.
  - Spieler in `antworten` und `auswertung`: `frage` gesetzt, `musterloesung` `null`, fremde `antwort` `null`, `istBereit` stimmt, eigene Antwort sichtbar, `richtig` überall `null`.
  - Spieler in `aufgeloest`: Musterlösung, alle Einsätze, Antworten und `richtig` sichtbar, fehlende Antwort hat `richtig: false`.
  - `JSON.stringify(spielerAnsicht(...))` in `einsatz` und `antworten` enthält weder den Text der Musterlösung noch die fremde Antwort (Schwerpunkt 1).
  - Quiz-Master sieht in jeder gestarteten Phase Frage, Musterlösung, alle Einsätze und Antworten.
  - `spieltMit` ist für später Einsteigende `false`, `verbunden` folgt `verbundeneIds`.
  - `sieger` ist bis zum Ende leer, in `beendet` enthält es die IDs.
- [x] **Schritt 2: Umsetzen, `npm test -- src/regeln/ansicht.test.ts`, grün.**
- [x] **Schritt 3: `npm run check`, committen:** „Add role based views“

### Aufgabe 4: Nachrichten und Beispiel-Quiz

**Dateien:** Neu `src/protokoll.ts`, Test `src/protokoll.test.ts`; Neu `src/regeln/beispielQuiz.ts`, Test `src/regeln/beispielQuiz.test.ts`

**Schnittstellen:**

- Liefert: `type Aktion` (Nachrichten oben), `type ServerNachricht`, `aktionLesen(roh: string): Aktion | null`, `BEISPIEL_QUIZ: Quiz`

- [x] **Schritt 1: Tests schreiben, rot**
  - `aktionLesen` liefert für jede Nachricht aus der Tabelle die Aktion. `null` für `"kaputt"`, `"null"`, `"[]"`, unbekannten `typ`, `einsatz` als Text, fehlenden `text`, `antwort-auswerten` ohne `richtig` als boolean, `spielerId` kein Text (Schwerpunkt 3).
  - `BEISPIEL_QUIZ` hat 3 Kategorien mit je 3 Fragen, jede mit Text und Musterlösung, und `partieErstellen` nimmt es an.
- [x] **Schritt 2: Umsetzen. Fragen selbst formulieren, keine fremde Quelle.** `npm test -- src/protokoll.test.ts src/regeln/beispielQuiz.test.ts`, grün.
- [x] **Schritt 3: `npm run check`, committen:** „Add protocol and sample quiz“

### Aufgabe 5: Eröffnen, beitreten, verbinden

**Dateien:** Ändern `worker/index.ts`, `worker/spielraum.ts`, Test `worker/spielraum.test.ts`

**Schnittstellen:**

- Nutzt: `raumcodeErzeugen`, `istGueltigerRaumcode`, `BEISPIEL_QUIZ`, `partieErstellen`, `spielerBeitreten`, die Ansichten
- Liefert: die HTTP-Wege oben. Gespeicherter `Raumstand { partie: Partie; quizMasterToken: string; spielerTokens: Record<string, string>; rueckkehrAnfragen: { token: string; spielerId: string }[] }` unter dem Schlüssel `"stand"`

- [x] **Schritt 1: Tests schreiben, rot**
  - `POST /api/raeume` liefert 201, gültigen Raumcode und Token. Ist ein Code schon belegt, nimmt der Worker einen anderen.
  - `POST …/spieler` liefert 201 und Token, unbekannter Raum 404, ungültiger Code 404, doppelter Name 409, zu langer Name 422, kein JSON 422.
  - Verbindung mit Spieler-Token bekommt sofort `{ typ: "ansicht" }` mit `rolle: "spieler"`, mit Quiz-Master-Token `rolle: "quiz-master"`.
  - Beitritt schickt allen offenen Verbindungen die neue Ansicht, `verbunden` stimmt.
  - Falsches Token und `constructor` führen zum Schließcode 4001 (Schwerpunkt 3).
  - Ohne Upgrade-Kopfzeile antwortet `…/verbindung` mit 426.
  - Zweite Verbindung mit demselben Token schließt die alte mit 4003 (Schwerpunkt 4).
  - Beim Trennen einer Verbindung sehen die anderen `verbunden: false`.
- [x] **Schritt 2: Umsetzen.** Token und Rolle stehen per `serializeAttachment` an der Verbindung. Den Spielstand vor jeder Aktion aus `ctx.storage` lesen.
- [x] **Schritt 3: `npm test -- worker`, grün.**
- [x] **Schritt 4: `npm run check`, committen:** „Add room creation and connections“

### Aufgabe 6: Aktionen und Rechte

**Dateien:** Ändern `worker/spielraum.ts`, Test `worker/spielraum.test.ts`

**Schnittstellen:**

- Nutzt: `aktionLesen`, alle Funktionen aus `partie.ts`
- Liefert: `webSocketMessage` setzt jede Aktion um, speichert und schickt allen ihre Ansicht

- [x] **Schritt 1: Tests schreiben, rot**
  - Eine ganze Partie mit Quiz-Master und zwei Spielern über WebSockets endet mit dem erwarteten Chipstand und `sieger`.
  - Spieler schickt `frage-zeigen`, `aufloesen`, `antwort-auswerten` oder `spieler-entfernen`: `{ typ: "fehler", code: "keine-berechtigung" }`, Stand unverändert (Schwerpunkt 1).
  - Quiz-Master schickt `einsatz-setzen`: ebenfalls `keine-berechtigung`.
  - `einsatz-setzen` von Anna ändert nur Annas Einsatz, Bens Ansicht zeigt nur `hatGesetzt` (Schwerpunkt 1).
  - Regelverstoß geht als Fehler nur an den Absender, die anderen bekommen nichts.
  - Kaputte Nachricht: `ungueltige-nachricht` (Schwerpunkt 3).
  - Nach `evictDurableObject` mitten in der Runde bleiben Einsatz und Verbindung erhalten, die nächste Aktion gelingt (Schwerpunkt 2).
- [x] **Schritt 2: Umsetzen.** Für `Regelfehler` den Code schicken, andere Fehler nicht abfangen.
- [x] **Schritt 3: `npm test -- worker`, grün.**
- [x] **Schritt 4: `npm run check`, committen:** „Add game actions and permissions“

### Aufgabe 7: Rückkehr, Entfernen, Raumende, PR 1

**Dateien:** Ändern `worker/spielraum.ts`, `worker/spielraum.test.ts`, `CLAUDE.md`

**Schnittstellen:**

- Liefert: `POST …/rueckkehr`, Aktionen `rueckkehr-bestaetigen`, `rueckkehr-ablehnen`, `spieler-entfernen`, `raum-schliessen`, `alarm()`

- [x] **Schritt 1: Tests schreiben, rot**
  - `POST …/rueckkehr` mit bekanntem Namen liefert Token, Verbindung damit bekommt nur `wartet-auf-bestaetigung`, keine Ansicht (Schwerpunkt 5). Der Quiz-Master sieht die Anfrage.
  - `rueckkehr-bestaetigen`: Neues Gerät bekommt die Ansicht des Spielers mit seinem Chipstand, altes Token schließt mit 4003 und gilt nicht mehr.
  - `rueckkehr-ablehnen`: Neues Gerät wird mit 4001 geschlossen.
  - Eine Anfrage gibt es je Spieler nur einmal, eine neue ersetzt die alte.
  - `spieler-entfernen` schließt die Verbindung mit 4003, die anderen sehen ihn nicht mehr, das Token gilt nicht mehr.
  - `raum-schliessen` schließt alle mit 4002, und ein neuer Beitritt liefert 404.
  - Jede Aktion setzt den Alarm auf 24 Stunden. `runDurableObjectAlarm` löscht den Stand und schließt mit 4002.
- [x] **Schritt 2: Umsetzen, `npm test -- worker`, grün.**
- [x] **Schritt 3: `npm run dev` starten und per `curl` gegen `/api/raeume` prüfen, ob der Worker im Dev-Server antwortet.**
- [x] **Schritt 4: `CLAUDE.md` Repo-Struktur ergänzen, `npm run check`, committen, PR öffnen:** „Add online game room server“
- [ ] **Schritt 5: `/code-review`, `plan-pruefer` für die Aufgaben 1 bis 7, Funde mit dem Entwickler durchgehen, bei grüner CI mergen.**

## PR 2: Oberfläche und Veröffentlichung

### Aufgabe 8: Verbindung, Start und Warten

**Dateien:** Neu `src/verbindung.svelte.ts`, `src/ansichten/Start.svelte`, `src/ansichten/Warten.svelte`, `src/stil.css`; Ändern `src/App.svelte`, `src/main.ts`

**Schnittstellen:**

- Nutzt: HTTP-Wege und Nachrichten oben
- Liefert: `verbindungOeffnen(raumcode: string, token: string)` mit `ansicht`, `fehler`, `zustand` als Runes und `senden(aktion: Aktion): void`; Token in `localStorage` unter `quiz-poker:<RAUMCODE>`

- [ ] **Schritt 1: Oberfläche nach Stil C bauen:** Start mit „Spielraum eröffnen“ und „Spielraum beitreten“. `/raum/ABCD` zeigt nur noch das Namensfeld. Warten mit Raumcode, Link, Spielerliste und beim Quiz-Master „Partie starten“ ab 2 Spielern.
- [ ] **Schritt 2: Verhalten:** Beim Abbruch neu verbinden nach 1, 2, 4, höchstens 10 Sekunden. Bei 4001 Token löschen und zum Start, bei 4002 „Spielraum geschlossen“, bei 4003 „Auf einem anderen Gerät geöffnet oder entfernt“, kein neuer Versuch. Bei `name-vergeben` fragen, ob der Spieler zurückkehren möchte, dann `…/rueckkehr`, danach „Warten auf Bestätigung“.
- [ ] **Schritt 3: Prüfen mit Skill `run`:** `npm run dev`, zwei getrennte Browser-Profile, weil `localStorage` je Profil gilt. Raum eröffnen, beitreten, Spieler erscheint, Seite neu laden, Stand bleibt.
- [ ] **Schritt 4: `npm run check`, committen:** „Add start and waiting views“

### Aufgabe 9: Spielansichten

**Dateien:** Neu `src/ansichten/SpielerRunde.svelte`, `src/ansichten/QuizMasterRunde.svelte`, `src/ansichten/Aufloesung.svelte`, `src/ansichten/Ende.svelte`, `src/ansichten/Rangliste.svelte`; Ändern `src/App.svelte`

**Schnittstellen:**

- Nutzt: `SpielerAnsicht`, `QuizMasterAnsicht`, `mindesteinsatzFuer`, `senden`

- [ ] **Schritt 1: Spieler:** Einsatz mit Regler und Zahl, Mindestwert aus `mindesteinsatzFuer`, Freitext mit Zähler 200, „Bereit“ löst sich wieder. Später Einsteigende sehen dasselbe ohne Eingabefelder, mit „Du spielst ab der nächsten Runde mit“.
- [ ] **Schritt 2: Quiz-Master:** Knöpfe für jede Phase, im Einsatz und bei den Antworten mit Anzeige, wer noch fehlt und Weiterschalten trotzdem möglich. Auswertung als Tabelle, „Auflösen“ gesperrt, bis alle Antworten ausgewertet sind. Hinweis „Anna möchte zurück“, Entfernen mit Rückfrage, „Spielraum schließen“ mit Rückfrage.
- [ ] **Schritt 3: Auflösung und Ende nach Stil C, Gleichstand mit mehreren Siegern.** Serverfehler erscheinen als kurze Meldung.
- [ ] **Schritt 4: Prüfen mit Skill `run`:** ganze Partie mit Quiz-Master und zwei Spielern in getrennten Browser-Profilen, in 1280 und 1440 px, dazu später Einstieg, Abbruch mit Neuladen und Rückkehr per Quiz-Master. Musterlösung bei einem Spieler in den Entwicklerwerkzeugen unter den WebSocket-Nachrichten suchen, sie darf vor der Auflösung nicht auftauchen.
- [ ] **Schritt 5: `npm run check`, committen:** „Add game views“

### Aufgabe 10: PR 2

**Dateien:** Ändern `CLAUDE.md`, `docs/tools/Svelte und Vite.md`

- [ ] **Schritt 1: Doku ergänzen, `npm run check`, committen, pushen, PR öffnen:** „Add game room interface“
- [ ] **Schritt 2: `/code-review`, `plan-pruefer`, Funde mit dem Entwickler durchgehen, bei grüner CI mergen.**

### Aufgabe 11: Veröffentlichung und Abschluss

**Dateien:** Ändern `docs/tools/Cloudflare Workers und Durable Objects.md`, `docs/Arbeitsumgebung.md`, Journal, Roadmap, Übergabe, dieser Plan

- [ ] **Schritt 1: Der Entwickler legt ein Cloudflare-Konto an und führt `npx wrangler login` aus.** Das kann nur er.
- [ ] **Schritt 2: Der Entwickler führt `npm run deploy` von `main` aus,** nachdem Claude die Folgen erklärt hat: Die Seite ist dann öffentlich erreichbar.
- [ ] **Schritt 3: Prüfen:** Unter der echten Adresse `/api/health` abrufen und eine Partie mit zwei Browser-Profilen spielen. Danach Adresse in die Doku.
- [ ] **Schritt 4: Phase abschließen mit den Skills `journal` und `naechste-session`,** Roadmap abhaken.

Erwartet: `git status --short` leer, `gh pr list --state open` leer, Branch `main`, Partie über die öffentliche Adresse gespielt.
