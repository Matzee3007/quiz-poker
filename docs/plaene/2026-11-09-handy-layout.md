---
titel: "Plan: Handy-Layout für Spieler"
status: aktiv
erstellt: 2026-11-09
tags: [plan, phase-4, handy, oberflaeche]
---

# Plan: Handy-Layout für Spieler

**Ziel:** Spieler können eine ganze Partie auf dem Handy (375 px breit, Safari) spielen: beitreten, setzen, antworten,
Auflösung und Ende sehen, ohne seitlich zu scrollen.

**Vorgehen:** Hauptsächlich CSS: `min-width: 1100px` entfällt, ein Block `@media (max-width: 700px)` setzt die Werte aus
dem Mock. Neu ist nur die Ranglisten-Leiste (Variante A) als eigene Komponente. Die Tabelle der Auflösung wird auf dem Handy
per CSS-Grid zur zweizeiligen Liste, ohne zweites Markup. Ein neuer Playwright-Durchlauf in WebKit mit Gerät „iPhone 13
Mini“ belegt jede Ansicht.

**Technik:** Svelte 5, CSS, Playwright 1.64.1 mit WebKit (Version 2370)

**Anforderung:** [[projects/quiz-poker/docs/Projektvision|Projektvision]] Phase 4 („Feinschliff, z. B. fürs Handy“),
Mock [[projects/quiz-poker/docs/mocks/2026-11-09-handy.html|2026-11-09-handy.html]], Variante A, freigegeben am
2026-11-09.

**Versuch:** WebKit installieren (`npx playwright install webkit`) und den vorhandenen Test „Beispiel-Quiz eröffnet einen
Spielraum“ einmal in WebKit laufen lassen (`npx playwright test -g "Beispiel-Quiz" --browser webkit`). Trägt der Weg,
also WebKit mit Vite-Server und WebSocket lokal? Ergebnis: **trägt** (2026-11-12). Beide Tests „ohne Konto“ laufen in
WebKit mit `devices["iPhone 13 Mini"]` grün, über eine Wegwerf-Config.

## Feste Vorgaben

- Breakpoint genau `@media (max-width: 700px)`, wie im Mock von 2026-11-07. Über 700 px bleibt das heutige Aussehen gleich.
- Daumenziele mindestens 44 px hoch, Hauptknöpfe 52 px und volle Breite, Eingaben `font-size: 17px` (iOS zoomt unter 16 px).
- Einsatzzahl `.grosszahl` bleibt 64 px in Gold.
- Ansicht je Rolle bleibt unverändert: Kein neues Feld geht an den Browser, die Leiste zeigt nur, was `SpielerAnsicht` schon hat.
- Nur Spieler-Ansichten und die Startseite. Der Quiz-Master bleibt am Laptop.
- Vor dem PR `npm run check` und `npm run test:browser` (beide Projekte).

## Prüf-Schwerpunkte

1. Seite in 375 px Breite in jeder Spieler-Phase: `document.documentElement.scrollWidth <= 375` (kein seitliches Scrollen). Test: Aufgaben 1, 3, 4.
2. Desktop bei 1280 px sieht aus wie vorher: Der bestehende Durchlauf in Chromium bleibt grün, und die Leiste ist dort unsichtbar. Test: Aufgabe 3.
3. Gleichstand in der Rangliste: Zwei Spieler mit gleichen Chips haben denselben Platz, in Leiste und Auflösung. Test: Aufgabe 2.
4. Offene Tastatur auf einem echten iPhone: Leiste und Hauptknopf bleiben bedienbar. Lässt sich in Playwright nicht nachbauen, deshalb Abnahme durch den Entwickler am eigenen Handy (Aufgabe 5).
5. Unsichtbare Anforderung: Fremde Antworten und die Musterlösung erscheinen auf dem Handy erst in der Auflösung. Dazu gibt es keinen neuen Code, die Tests von `src/regeln/ansicht.ts` und `worker/spielraum.test.ts` decken das schon ab. Der Handy-Durchlauf prüft zusätzlich, dass die Musterlösung in der Antwortphase nicht im Text der Seite steht (Aufgabe 3).

## Fremde Dienste

keine

## Dateien

- Ändern: `src/stil.css`: `min-width` raus, Block `@media (max-width: 700px)`, neue Klassen `.rang-leiste`, `.rang-panel`, `.aktion`
- Neu: `src/ansichten/RanglisteLeiste.svelte`: Leiste „Platz x von n · Chips · Rangliste ▾“ mit aufklappbarer Liste, nur auf dem Handy sichtbar
- Ändern: `src/ansichten/SpielerRunde.svelte`: Leiste oben, Hauptknopf in `.aktion`
- Ändern: `src/ansichten/Aufloesung.svelte`: Klassen an den Zellen für das Grid, `platzVon` aus `ansicht.ts`
- Ändern: `src/regeln/ansicht.ts` und Test: neue Funktion `platzVon`
- Ändern: `playwright.config.ts`: Projekt `handy`
- Neu: `browser/handy.spec.ts`
- Neu: `docs/adr/0010-webkit-fuer-handy-durchlauf.md`, ändern: `docs/tools/Playwright.md`, Mock `docs/mocks/2026-11-09-handy.html` (kommt mit in den PR)

### Aufgabe 1: Handy-Durchlauf und Grundlayout

**Dateien:** `playwright.config.ts`, `browser/handy.spec.ts`, `src/stil.css`, `src/App.svelte` (nur Klassen am Kopf, falls nötig)

**Schnittstellen:**
- Liefert: Projekt `handy` (WebKit, `testMatch: /handy\.spec\.ts/`); das Projekt `chromium` bekommt `testIgnore: /handy\.spec\.ts/`.
  Hilfen in `handy.spec.ts`: `raumMitSpielern(browser): Promise<{ quizMaster: Page; sophie: Page; tim: Page; raumcode: string }>`
  (Quiz-Master mit `viewport: 1280×800`, Spieler mit `devices["iPhone 13 Mini"]`), `ohneSeitlichesScrollen(page): Promise<void>`

- [x] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
test("Startseite, Beitreten und Warten passen auf 375 px", async ({ browser }) => {
  const { sophie } = await raumMitSpielern(browser); // Quiz-Master eröffnet Beispiel-Quiz, Sophie und Tim treten über /raum/<code> bei
  await ohneSeitlichesScrollen(sophie);              // erwartet scrollWidth <= 375
  await expect(sophie.locator(".raumcode")).toBeVisible();
  const start = await sophie.context().newPage();
  await start.goto("/");
  await ohneSeitlichesScrollen(start);
  // Beitreten steht vor „Spielraum eröffnen“
  const beitreten = await start.getByRole("heading", { name: "Spielraum beitreten" }).boundingBox();
  const eroeffnen = await start.getByRole("heading", { name: "Spielraum eröffnen" }).boundingBox();
  expect(beitreten!.y).toBeLessThan(eroeffnen!.y);
});
```

- [x] **Schritt 2: Test laufen lassen, er muss fehlschlagen**

`npx playwright test --project handy`
Erwartet: FAIL, `scrollWidth` ist 1100

- [x] **Schritt 3: CSS**

`body { min-width: 1100px }` entfernen. Block `@media (max-width: 700px)` mit den Werten aus dem Mock: `.seite` und `.karte`
mit 16 px Innenabstand, `.zwei-spalten`, `.frage-loesung`, `.wege`, `.wege.drei` einspaltig, Kopf zweizeilig, Schriftgrößen,
Knopf- und Eingabehöhen aus den festen Vorgaben, Startseite mit `order`, damit „Beitreten“ oben steht.

- [x] **Schritt 4: Tests laufen lassen, sie müssen bestehen**

`npm run test:browser`
Erwartet: PASS in `chromium` und `handy`

- [x] **Schritt 5: Prüfen und committen**

```bash
npm run check
git add playwright.config.ts browser/handy.spec.ts src/stil.css
git commit -m "Add phone test run and base mobile layout"
```

### Aufgabe 2: Platz mit Gleichstand

**Dateien:** `src/regeln/ansicht.ts`, `src/regeln/ansicht.test.ts`, `src/ansichten/Aufloesung.svelte`

**Schnittstellen:**
- Liefert: `platzVon(spieler: SpielerZeile[], chips: number): number`. Der Platz ist 1 plus die Zahl der Spieler mit mehr Chips.

- [x] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
it("gibt Spielern mit gleichen Chips denselben Platz", () => {
  const spieler = [zeile("a", 150), zeile("b", 100), zeile("c", 100), zeile("d", 80)];
  expect([150, 100, 80].map((chips) => platzVon(spieler, chips))).toEqual([1, 2, 4]);
});
```

- [x] **Schritt 2: Test laufen lassen, er muss fehlschlagen**

`npx vitest run src/regeln/ansicht.test.ts`
Erwartet: FAIL, `platzVon` ist nicht exportiert

- [x] **Schritt 3: `platzVon` in `src/regeln/ansicht.ts`**, in `Aufloesung.svelte` die lokale Funktion dadurch ersetzen

- [x] **Schritt 4: Tests laufen lassen, sie müssen bestehen**

`npm test`
Erwartet: PASS

- [x] **Schritt 5: Prüfen und committen** (`npm run check`, `git commit -m "Share rank calculation with ties"`)

### Aufgabe 3: Ranglisten-Leiste und Runde auf dem Handy

**Dateien:** `src/ansichten/RanglisteLeiste.svelte`, `src/ansichten/SpielerRunde.svelte`, `src/stil.css`, `browser/handy.spec.ts`

**Schnittstellen:**
- Nutzt: `platzVon` (Aufgabe 2), `raumMitSpielern`, `ohneSeitlichesScrollen` (Aufgabe 1), `Rangliste.svelte` unverändert im Panel
- Liefert: `RanglisteLeiste.svelte` mit Props `{ spieler: SpielerZeile[]; ichId: string }`. Der Knopf heißt
  „Rangliste“ und hat `aria-expanded`, das Panel `aria-label="Rangliste"`. Über 700 px: `display: none`. Unter 700 px ist die
  `<aside>` von `Rangliste` neben der Runde ausgeblendet.

- [x] **Schritt 1: Fehlschlagende Tests schreiben**

```ts
test("Runde: Leiste zeigt Platz und Chips, Einsatz und Antwort per Daumen", async ({ browser }) => {
  const { quizMaster, sophie } = await raumMitSpielern(browser);
  await quizMaster.getByRole("button", { name: "Partie starten" }).click();
  await expect(sophie.locator(".rang-leiste")).toContainText("Platz 1 von 2");
  await expect(sophie.locator(".rang-leiste")).toContainText("100");
  await sophie.getByRole("button", { name: "Rangliste" }).click();
  await expect(sophie.getByLabel("Rangliste")).toContainText("Tim");
  await sophie.getByRole("button", { name: "Rangliste" }).click();
  const setzen = sophie.getByRole("button", { name: "Einsatz setzen" });
  expect((await setzen.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await setzen.click();
  await ohneSeitlichesScrollen(sophie);
  await quizMaster.getByRole("button", { name: "Frage zeigen" }).click();
  await expect(sophie.locator("body")).not.toContainText(<musterloesung der ersten Frage aus beispielQuiz.ts>);
  await sophie.getByLabel(/Deine Antwort/).fill("Canberra");
  await sophie.getByRole("button", { name: "Bereit" }).click();
  await ohneSeitlichesScrollen(sophie);
});

test("Desktop zeigt keine Leiste", async ({ page }) => { /* im Projekt chromium: Raum eröffnen, beitreten, .rang-leiste nicht sichtbar */ });
```

Den Desktop-Test legt `durchlauf.spec.ts` an, im Block „ohne Konto“.

- [x] **Schritt 2: Tests laufen lassen, sie müssen fehlschlagen**

`npm run test:browser`
Erwartet: FAIL, `.rang-leiste` nicht gefunden

- [x] **Schritt 3: `RanglisteLeiste.svelte`, in `SpielerRunde.svelte` über der Karte einbinden, Hauptknöpfe („Einsatz setzen/ändern“, „Bereit“) in `<div class="aktion">` (`position: sticky; bottom: 0` nur unter 700 px), Regler mit 44 px Trefferhöhe und Griff in Gold, `.schnellwahl` als Raster `1fr 1fr 1fr 1.5fr`**

- [x] **Schritt 4: Tests laufen lassen, sie müssen bestehen**

`npm run test:browser`
Erwartet: PASS in beiden Projekten

- [x] **Schritt 5: Prüfen und committen** (`npm run check`, `git commit -m "Add ranking bar and thumb-sized round view on phones"`)

### Aufgabe 4: Auflösung und Ende auf dem Handy

**Dateien:** `src/ansichten/Aufloesung.svelte`, `src/stil.css`, `browser/handy.spec.ts`

**Schnittstellen:**
- Nutzt: `raumMitSpielern`, `ohneSeitlichesScrollen` (Aufgabe 1)
- Liefert: Klassen an den Zellen der Tabelle (`platz`, `name`, `einsatz`, `antwort`, `ergebnis`, `aenderung`, `chips`). Unter 700 px
  werden `thead` ausgeblendet und jedes `tr` zu einem Grid: Zeile 1 enthält Platz, Name und Chips, Zeile 2 Antwort, Ergebnis und Änderung.

- [x] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
test("Auflösung und Ende passen auf 375 px", async ({ browser }) => {
  const { quizMaster, sophie } = await raumMitSpielern(browser);
  // Partie starten, Frage zeigen, Sophie antwortet, Quiz-Master: Auswertung starten, je Spieler Richtig/Falsch, Auflösen
  await expect(sophie.getByText("Musterlösung")).toBeVisible();
  await ohneSeitlichesScrollen(sophie);
  // Quiz-Master klickt „Weiter“ durch bis zum Ende (Beispiel-Quiz: 9 Runden, je Runde Frage zeigen, Auswertung, Auflösen)
  await expect(sophie.getByLabel("Podest")).toBeVisible();
  await ohneSeitlichesScrollen(sophie);
});
```

Ist der Weg zum Ende über 9 Runden zu lang (über 30 Sekunden), prüft der Test das Ende über ein Einmal-Quiz mit einer Frage.

- [x] **Schritt 2: Test laufen lassen, er muss fehlschlagen**

`npx playwright test --project handy -g "Auflösung"`
Erwartet: FAIL, `scrollWidth` größer als 375 wegen der Tabelle mit 7 Spalten

- [x] **Schritt 3: Klassen an den Zellen, Grid-Regeln im Block für das Handy, `.podest` mit `gap: 8px`, `.podest-platz` schmaler**

- [x] **Schritt 4: Tests laufen lassen, sie müssen bestehen** (`npm run test:browser`, PASS)

- [x] **Schritt 5: Prüfen und committen** (`npm run check`, `git commit -m "Fit resolution and end view on phones"`)

### Aufgabe 5: Entscheidung festhalten und Abnahme am Handy

**Dateien:** `docs/adr/0010-webkit-fuer-handy-durchlauf.md`, `docs/tools/Playwright.md`, `docs/mocks/2026-11-09-handy.html`

- [x] **Schritt 1: ADR 0010** (Kontext: ADR 0007 hat WebKit für Phase 4 offen gelassen. Entscheidung: Projekt `handy` in WebKit
  nur für `handy.spec.ts`. Alternativen: alle Tests in drei Browsern, oder nur die Breite in Chromium. Konsequenzen: der
  Browser-Cache braucht WebKit 2370, und der Durchlauf dauert länger.) Dazu ein Verweis in ADR 0007 und in der Playwright-Notiz.
- [x] **Schritt 2: Lokaler Server im WLAN:** `npx vite --host` macht den Server im eigenen Netz erreichbar. Die Adresse
  `http://<IP des Mac>:5173` steht in der Ausgabe. So muss nichts Ungemergtes deployt werden.
- [x] **Schritt 3: Abnahme am eigenen iPhone:** Der Entwickler eröffnet am Mac einen Raum, tritt mit dem Handy bei, setzt, (2026-11-15: „passt“)
  antwortet bei offener Tastatur und sieht Auflösung und Ende. Was auffällt, wird im selben PR behoben.
- [ ] **Schritt 4: Committen, PR, `/code-review`, `plan-pruefer`**
