---
titel: "Plan: Regelkern"
status: aktiv
erstellt: 2026-11-03
tags: [plan, regeln, phase-1, tdd]
---

# Plan: Regelkern

**Ziel:** Eine ganze Partie lässt sich als reine Funktionen durchspielen und ist vollständig getestet, noch ohne Oberfläche und Server.

**Vorgehen:** Der Spielstand ist ein einfaches Objekt `Partie`. Jede Spielaktion ist eine Funktion, die einen Spielstand nimmt und
einen neuen zurückgibt, oder bei einem Regelverstoß einen `Regelfehler` wirft. Das Durable Object kann diese Funktionen in Phase 2
direkt aufrufen. Die Reihenfolge der Aufgaben folgt dem Ablauf einer Runde.

**Technik:** TypeScript, Vitest 4. Keine neuen Abhängigkeiten.

**Anforderung:** [[projects/quiz-poker/docs/Projektvision|Projektvision]], Abschnitt „Spielregeln“ und Phase 1. Begriffe aus dem
[[projects/quiz-poker/docs/Glossar|Glossar]].

## Feste Vorgaben

- Code nur in `src/regeln/`, ohne Importe aus Svelte, Cloudflare oder dem Browser.
- Startchips 100, Mindesteinsatz 10 (oder der Rest, falls weniger da ist), höchstens 8 Spieler, zum Start mindestens 2.
- Funktionen verändern ihre Eingabe nie, sie geben einen neuen Spielstand zurück.
- Regelverstöße werfen `Regelfehler`, dessen `message` der Code ist. Tests prüfen mit `toThrow("<code>")`.
- Namen im Code und in Tests auf Deutsch, wie im Glossar.
- Test zuerst (Skill `tdd`). Vor jedem Commit `npm run check`.

## Nicht in dieser Phase

- Was jede Rolle sehen darf, Raumcode, Token und die Neuzuordnung eines Spielers per Name: Das braucht den Server, kommt in Phase 2.
- Prüfung beim Erstellen eines Quiz über „nicht leer“ hinaus (Größenlimit): kommt mit dem Editor in Phase 3.

## Prüf-Schwerpunkte

1. Wer ohne Antwort bleibt, verliert seinen Einsatz, aber wer keinen Einsatz gesetzt hat, verliert nichts: Tests in Aufgabe 5.
2. Wer alles setzt und falsch liegt, steht bei 0 und bekommt zu Beginn der nächsten Runde 10 Chips, nach der letzten Runde aber
   nicht mehr: Tests in Aufgabe 6.
3. Wer während einer Runde beitritt, bleibt bei der Auflösung bei 100 Chips und spielt ab der nächsten Runde mit: Test in Aufgabe 7.
4. Doppeltes Auflösen zahlt nicht doppelt aus, sondern schlägt fehl: Test in Aufgabe 5.
5. Wird ein Spieler während der Auswertung entfernt, lässt sich die Runde ohne ihn auflösen: Test in Aufgabe 7.

### Aufgabe 1: Chips

**Dateien:**

- Neu: `src/regeln/fehler.ts`, `src/regeln/chips.ts`
- Test: `src/regeln/chips.test.ts`

**Schnittstellen:**

- Liefert:
  - `type RegelfehlerCode = "falsche-phase" | "unbekannter-spieler" | "nicht-in-runde" | "leerer-name" | "name-vergeben" | "raum-voll" | "zu-wenige-spieler" | "ungueltiger-einsatz" | "leere-antwort" | "keine-antwort" | "nicht-ausgewertet" | "leeres-quiz"`
  - `class Regelfehler extends Error` mit `constructor(code: RegelfehlerCode)`, `message` ist der Code
  - `START_CHIPS = 100`, `MINDESTEINSATZ = 10`
  - `mindesteinsatzFuer(chips: number): number`
  - `istGueltigerEinsatz(einsatz: number, chips: number): boolean`
  - `chipsNachRunde(chips: number, einsatz: number, richtig: boolean): number`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**

```ts
expect(mindesteinsatzFuer(100)).toBe(10);
expect(mindesteinsatzFuer(5)).toBe(5);
expect(istGueltigerEinsatz(10, 100)).toBe(true);
expect(istGueltigerEinsatz(100, 100)).toBe(true);
expect(istGueltigerEinsatz(9, 100)).toBe(false);
expect(istGueltigerEinsatz(101, 100)).toBe(false);
expect(istGueltigerEinsatz(10.5, 100)).toBe(false);
expect(istGueltigerEinsatz(Number.NaN, 100)).toBe(false);
expect(istGueltigerEinsatz(5, 5)).toBe(true);
expect(istGueltigerEinsatz(4, 5)).toBe(false);
expect(chipsNachRunde(100, 5, true)).toBe(105);
expect(chipsNachRunde(100, 5, false)).toBe(95);
expect(chipsNachRunde(100, 100, false)).toBe(0);
expect(new Regelfehler("raum-voll").message).toBe("raum-voll");
```

- [x] **Schritt 2: `npm test -- src/regeln/chips.test.ts`, muss fehlschlagen**, weil das Modul fehlt.
- [x] **Schritt 3: `fehler.ts` und `chips.ts` nach den Schnittstellen umsetzen.**
- [x] **Schritt 4: `npm test -- src/regeln/chips.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add chip rules“

### Aufgabe 2: Partie erstellen, beitreten, starten

**Dateien:**

- Neu: `src/regeln/partie.ts`
- Test: `src/regeln/partie.test.ts`, mit Testhilfe `gestartetePartie()` (Spieler `anna`, `ben`) und einem Quiz aus den Kategorien
  „Sport“ (2 Fragen) und „Gaming“ (1 Frage), für alle folgenden Aufgaben

**Schnittstellen:**

- Nutzt: `START_CHIPS`, `Regelfehler`
- Liefert:

```ts
interface Frage { text: string; musterloesung: string }
interface Kategorie { name: string; fragen: Frage[] }
interface Quiz { titel: string; kategorien: Kategorie[] }
interface Spieler { id: string; name: string; chips: number }
type Phase = "warten" | "einsatz" | "antworten" | "auswertung" | "aufgeloest" | "beendet";
interface Partie {
  quiz: Quiz;
  phase: Phase;
  kategorieIndex: number;
  frageIndex: number;
  spieler: Spieler[];
  rundenSpieler: string[]; // Spieler-IDs, festgelegt zu Beginn jeder Runde
  einsaetze: Record<string, number>;
  antworten: Record<string, string>; // nur bestätigte Antworten
  auswertungen: Record<string, boolean>;
}
function partieErstellen(quiz: Quiz): Partie;
function spielerBeitreten(partie: Partie, id: string, name: string): Partie;
function partieStarten(partie: Partie): Partie;
function aktuelleRunde(partie: Partie): { kategorie: string; frage: Frage };
```

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - `partieErstellen` liefert Phase `warten` und keine Spieler. Ein Quiz ohne Kategorien oder mit einer leeren Kategorie wirft `leeres-quiz`.
  - `spielerBeitreten` legt den Spieler mit 100 Chips an. Die Eingabe bleibt unverändert (`partie.spieler` hat danach weiter Länge 0).
  - Der Name wird getrimmt. Nur Leerzeichen werfen `leerer-name`, „Anna“ neben „anna“ wirft `name-vergeben`, eine doppelte ID ebenfalls.
  - Der 9. Spieler wirft `raum-voll`.
  - `partieStarten` mit einem Spieler wirft `zu-wenige-spieler`. Mit zwei liefert es Phase `einsatz` und beide als `rundenSpieler`.
  - `partieStarten` außerhalb von `warten` wirft `falsche-phase`.
  - `aktuelleRunde` nach dem Start liefert Kategorie „Sport“ und ihre erste Frage.

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, muss fehlschlagen**, weil das Modul fehlt.
- [x] **Schritt 3: Typen und die vier Funktionen in `partie.ts` umsetzen.**
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add match setup rules“

### Aufgabe 3: Einsatzphase

**Dateien:** Ändern `src/regeln/partie.ts`, Test `src/regeln/partie.test.ts`

**Schnittstellen:**

- Nutzt: `istGueltigerEinsatz`, `Partie`
- Liefert: `einsatzSetzen(partie: Partie, spielerId: string, einsatz: number): Partie`, `frageZeigen(partie: Partie): Partie`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - `einsatzSetzen` speichert den Einsatz, ein zweiter Aufruf ersetzt ihn.
  - Einsatz 9 wirft `ungueltiger-einsatz`, eine unbekannte ID `unbekannter-spieler`, ein Spieler außerhalb von `rundenSpieler` `nicht-in-runde`.
  - `frageZeigen` liefert Phase `antworten`, auch wenn nicht alle gesetzt haben. Ein fehlender Einsatz steht danach als 0 in `einsaetze`.
  - Nach `frageZeigen` wirft `einsatzSetzen` `falsche-phase`, ebenso `frageZeigen` selbst.

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, die neuen Tests müssen fehlschlagen.**
- [x] **Schritt 3: Beide Funktionen umsetzen.**
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add betting phase rules“

### Aufgabe 4: Antwortphase

**Dateien:** Ändern `src/regeln/partie.ts`, Test `src/regeln/partie.test.ts`

**Schnittstellen:**

- Liefert: `antwortBestaetigen(partie: Partie, spielerId: string, text: string): Partie`,
  `antwortZuruecknehmen(partie: Partie, spielerId: string): Partie`, `auswertungStarten(partie: Partie): Partie`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - `antwortBestaetigen` speichert den getrimmten Text. Nur Leerzeichen werfen `leere-antwort`.
  - Nach `antwortZuruecknehmen` steht keine Antwort mehr in `antworten`, und eine neue lässt sich bestätigen.
  - `auswertungStarten` liefert Phase `auswertung`, auch wenn nicht alle bestätigt haben.
  - Danach werfen `antwortBestaetigen` und `antwortZuruecknehmen` `falsche-phase`.
  - Spieler außerhalb der Runde werfen `nicht-in-runde`.

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, die neuen Tests müssen fehlschlagen.**
- [x] **Schritt 3: Die drei Funktionen umsetzen.**
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add answer phase rules“

### Aufgabe 5: Auswertung und Auflösung

**Dateien:** Ändern `src/regeln/partie.ts`, Test `src/regeln/partie.test.ts`

**Schnittstellen:**

- Nutzt: `chipsNachRunde`
- Liefert: `antwortAuswerten(partie: Partie, spielerId: string, richtig: boolean): Partie`, `aufloesen(partie: Partie): Partie`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - Anna setzt 20 und liegt richtig: 120 Chips. Ben setzt 30 und liegt falsch: 70 Chips. Phase ist danach `aufgeloest`.
  - `antwortAuswerten` lässt sich vor `aufloesen` korrigieren, es zählt die letzte Auswertung.
  - Vor `aufloesen` bleiben die Chips unverändert.
  - Auswerten eines Spielers ohne Antwort wirft `keine-antwort`.
  - Eine Antwort ohne Auswertung lässt `aufloesen` mit `nicht-ausgewertet` fehlschlagen.
  - Einsatz 30, aber keine Antwort: 70 Chips (Schwerpunkt 1).
  - Kein Einsatz und keine Antwort: weiter 100 Chips (Schwerpunkt 1).
  - Ein zweites `aufloesen` wirft `falsche-phase`, die Chips ändern sich nicht (Schwerpunkt 4).

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, die neuen Tests müssen fehlschlagen.**
- [x] **Schritt 3: Beide Funktionen umsetzen.**
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add evaluation and resolution rules“

### Aufgabe 6: Nächste Runde und Sieger

**Dateien:** Ändern `src/regeln/partie.ts`, Test `src/regeln/partie.test.ts`

**Schnittstellen:**

- Nutzt: `MINDESTEINSATZ`
- Liefert: `naechsteRunde(partie: Partie): Partie`, `sieger(partie: Partie): Spieler[]`

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - `naechsteRunde` liefert die nächste Frage in Phase `einsatz` und leert `einsaetze`, `antworten` und `auswertungen`.
  - Nach der letzten Frage von „Sport“ folgt die erste Frage von „Gaming“.
  - Nach der letzten Frage des Quiz liefert es Phase `beendet`.
  - Außerhalb von `aufgeloest` wirft es `falsche-phase`.
  - Wer bei 0 Chips steht, hat in der nächsten Runde 10 Chips (Schwerpunkt 2).
  - Endet die Partie, bleibt er bei 0 (Schwerpunkt 2).
  - `sieger` liefert den Spieler mit den meisten Chips, bei Gleichstand alle mit diesem Stand.
  - Eine ganze Partie über alle drei Fragen endet mit dem erwarteten Chipstand.

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, die neuen Tests müssen fehlschlagen.**
- [x] **Schritt 3: Beide Funktionen umsetzen.** `rundenSpieler` wird zu Beginn jeder Runde auf alle aktuellen Spieler gesetzt.
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add next round and winner rules“

### Aufgabe 7: Später einsteigen und Spieler entfernen

**Dateien:** Ändern `src/regeln/partie.ts`, Test `src/regeln/partie.test.ts`

**Schnittstellen:**

- Liefert: `spielerEntfernen(partie: Partie, spielerId: string): Partie`
- Ändert: `spielerBeitreten` ist in jeder Phase außer `beendet` erlaubt und nimmt den Spieler nicht in `rundenSpieler` auf

- [x] **Schritt 1: Fehlschlagende Tests schreiben**
  - Beitritt in Phase `einsatz`: Der neue Spieler bekommt 100 Chips, und `einsatzSetzen` wirft `nicht-in-runde`.
  - Beitritt in Phase `antworten`: Nach der Auflösung hat er weiter 100 Chips, in der nächsten Runde ist er in `rundenSpieler` (Schwerpunkt 3).
  - Beitritt in Phase `beendet` wirft `falsche-phase`.
  - `spielerEntfernen` nimmt den Spieler aus `spieler`, `rundenSpieler`, `einsaetze`, `antworten` und `auswertungen`.
  - Eine unbekannte ID wirft `unbekannter-spieler`, Phase `beendet` wirft `falsche-phase`.
  - Entfernen eines ausgewerteten Spielers während `auswertung`: `aufloesen` gelingt für den Rest (Schwerpunkt 5).

- [x] **Schritt 2: `npm test -- src/regeln/partie.test.ts`, die neuen Tests müssen fehlschlagen.**
- [x] **Schritt 3: `spielerEntfernen` umsetzen und `spielerBeitreten` anpassen.**
- [x] **Schritt 4: `npm test -- src/regeln/partie.test.ts`, muss bestehen.**
- [x] **Schritt 5: `npm run check`, dann committen:** „Add late joining and player removal rules“

### Aufgabe 8: PR und Abschluss von Phase 1

**Dateien:**

- Ändern: `CLAUDE.md` (Repo-Struktur: `src/regeln/` als vorhanden eintragen)
- Ändern: `docs/tools/Vitest, ESLint und Prettier.md` (neue Befehle oder Fehler, falls aufgetreten)
- Ändern: Journal, Roadmap, Übergabe, dieser Plan (`status: abgeschlossen`)

**Schnittstellen:**

- Liefert: `src/regeln/partie.ts` als Grundlage für das Durable Object in Phase 2

- [x] **Schritt 1: `CLAUDE.md` ergänzen, `npm run check`, committen, pushen und PR öffnen.** „Document rules module“
- [ ] **Schritt 2: `/code-review`, Funde mit dem Entwickler durchgehen.**
- [ ] **Schritt 3: Agent `plan-pruefer` prüft den Branch gegen diesen Plan.**
- [ ] **Schritt 4: `gh pr checks <nr>` grün und `MERGEABLE`, dann mergen.**
- [ ] **Schritt 5: Phase abschließen mit den Skills `journal` und `naechste-session`.**

Erwartet: `git status --short` leer, `gh pr list --state open` leer, Branch `main`.
