---
titel: Projektvision
status: aktiv
erstellt: 2026-11-02
tags: [projektvision, roadmap, quiz-poker]
---

# Projektvision: Quiz-Poker

## Ziel

Quiz-Poker ist ein Online-Quiz im Browser für Spieleabende in der Freundesrunde. Ein Quiz-Master erstellt das Quiz:
Kategorien (z. B. Sport, Gaming, Geographie), je Kategorie eine eigene Anzahl Runden, dazu Fragen und Antworten.

Alle Spieler starten mit derselben Anzahl Pokerchips und setzen in jeder Runde einen Teil davon. Wer richtig antwortet,
gewinnt Chips, wer falsch antwortet, verliert den Einsatz. Nach allen Kategorien und Runden gewinnt, wer die meisten
Chips hat. Spieler treten als Gäste per Link und Raumcode bei, der Quiz-Master leitet die Partie mit seinem Konto, jeder
am eigenen Gerät. Fachbegriffe stehen im [[projects/quiz-poker/docs/Glossar|Glossar]].

Der spätere Game-Launcher (im Ecosystem vorgemerkt) soll das Spiel über seine Web-Adresse öffnen, eine eigene
Installation ist dafür nicht nötig.

Die Seite ist frei erreichbar, aber nicht beworben und für Freundesrunden gedacht. Ausdrücklich nicht: beworbene
Plattform, Benutzerkonten für Spieler, Echtgeld (Chips sind reine Spielpunkte).

**Rahmen:** 2 bis 8 Spieler plus Quiz-Master, im selben Raum oder per Videoanruf. Das Spiel bringt weder Ton noch Video mit.

## Spielregeln

**Ablauf einer Runde** (eine Runde ist genau eine Frage, der Quiz-Master schaltet jeden Schritt von Hand weiter, ohne Timer):

1. Die Kategorie wird angezeigt.
2. Alle setzen geheim und können den Einsatz ändern, bis die Frage gestellt wird.
3. Die Frage erscheint.
4. Alle tippen ihre Antwort als Freitext und drücken „Bereit“. Sie können bis zum Start der Auswertung noch ändern.
5. Der Quiz-Master sieht Musterlösung und Antworten und markiert jeden Spieler als richtig oder falsch. Das kann er bis zur
   Auflösung korrigieren.
6. Auflösung: Die Chips ändern sich, und alle sehen Einsätze, Antworten und Ergebnis.

**Chips:**

- Gespielt wird gegen die Bank, Spieler nehmen sich keine Chips ab.
- Alle starten mit 100 Chips. Richtig bringt so viele Chips wie der Einsatz, falsch verliert den Einsatz.
- Mindesteinsatz 10 oder der Rest, falls weniger da ist. Höchsteinsatz sind alle eigenen Chips. Nur ganze Zahlen.
- Wer bei 0 Chips steht, bekommt zu Beginn der nächsten Runde den Mindesteinsatz.
- Chipstände sind immer für alle sichtbar. Am Ende gewinnt, wer die meisten Chips hat, bei Gleichstand gibt es mehrere
  Sieger.

**Sonderfälle:**

- Der Quiz-Master kann Einsatz- und Antwortphase von Hand beenden. Ein fehlender Einsatz zählt als 0, eine fehlende Antwort
  (nicht auf „Bereit“) als falsch.
- Beitreten geht bis zur letzten Runde, in ihr nicht mehr. Wer später kommt, bekommt die Startchips und spielt ab der nächsten
  Runde mit. Wer entfernt wurde, kann neu beitreten und hat wieder die Startchips, das wird bewusst hingenommen.
- Spieler finden nach einem Abbruch über ein Token im Browser zurück. Geht ein Gerät verloren, ordnet der Quiz-Master den
  Spieler per Name neu zu. Er kann Spieler auch entfernen.
- Ein Spielraum endet, wenn der Quiz-Master ihn schließt oder er längere Zeit ungenutzt ist.

## Quiz-Sammlung

- Quizze gehören dem Konto ihres Erstellers ([[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]]) und
  liegen in D1 ([[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]]).
- Ein privates Quiz kann nur sein Ersteller sehen und bearbeiten.
- Ein öffentliches Quiz kann jeder in der Sammlung mit Titel und Kategorien sehen und mit einem Konto als eigene Kopie zum
  Spielen und Bearbeiten übernehmen. Die Kopie ist unabhängig vom Original und zunächst privat.
- Schutzregeln, weil sich jeder ein Konto anlegen kann: Neue Quizze sind zunächst privat, die Größe eines Quiz ist begrenzt,
  und der Entwickler kann jedes Quiz löschen.
- Bewusst hingenommen: Bei öffentlichen Quizzen kann ein Mitspieler vorab die Lösungen sehen. Wer sichergehen will, nimmt ein
  eigenes privates Quiz.

Weitere Notizen: [[projects/quiz-poker/docs/Arbeitsumgebung|Arbeitsumgebung]] (was der Rechner braucht), [[projects/quiz-poker/docs/Nächste Session|Nächste Session]] (womit es weitergeht),
[[projects/quiz-poker/docs/Tools für später|Tools für später]] (vorgemerkte Werkzeuge).

## Lernziel

- **Echtzeit-Multiplayer:** Alle Geräte bleiben über WebSockets im selben Spielstand, auch nach einem Abbruch.
- **Rollen und Rechte:** Der Quiz-Master sieht die Lösungen, Spieler bekommen sie erst bei der Auflösung.
- **Spiellogik mit Tests:** Die Regeln für Chips und Einsätze entstehen testgetrieben.
- **Neuer Stack:** Svelte, Vite, Cloudflare Workers und Durable Objects.

Arbeitsweise (aus der globalen `CLAUDE.md`):
- Erst erklären lassen, dann ausführen. Bei jedem Befehl „Warum?“ fragen.
- Kleine Schritte, ein Pull Request pro Feature.
- Neue Aufgabe: `grill-with-docs` → `plan-schreiben` → `tdd` → `fertig-pruefen`.
- Am Ende jeder Session `journal` und `naechste-session`.

## Stack

Begründung und Alternativen: [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].

| Aufgabe | Werkzeug |
|---|---|
| Sprache | TypeScript |
| Oberfläche | Svelte 5 mit Vite 8 |
| Server und Echtzeit | Cloudflare Workers und Durable Objects, WebSockets |
| Quiz-Sammlung und Konten (ab Phase 3) | Cloudflare D1, Login-Bibliothek (Kandidat Better Auth) |
| Hosting | Cloudflare (kostenloser Tarif), `wrangler` |
| Tests | Vitest 4 |
| Qualität | ESLint, Prettier, `svelte-check` |

## Architekturentscheidungen

1. **Der Server ist die Wahrheit:** Spielstand, Einsätze und Lösungen liegen auf dem Server, der Browser bekommt innerhalb
   einer Partie nur, was seine Rolle sehen darf.
2. **Regeln ohne Technik:** Die Spielregeln sind reines TypeScript und werden testgetrieben entwickelt.
3. **Ein Raum, ein Durable Object:** Jeder Spielraum hat genau ein Objekt, das seinen Zustand verwaltet.
4. **Stack:** [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].
5. **Quiz-Sammlung in D1:** [[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]].
6. **Konten nur für Quiz-Master:** [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]].

## Roadmap

Jede Phase endet mit etwas, das läuft und getestet ist. Eine fertige Phase wird in derselben Session
abgeschlossen (Regel „Phasenwechsel“ in der globalen `CLAUDE.md`).

- [x] **Phase 0 – Fundament:** Repo und `CLAUDE.md` stehen, Stack eingerichtet, erster Test grün,
  Projektvision mit `/grill-with-docs` geschärft, Phasen 1 bis 4 geplant
- [x] **Phase 1 – Regelkern:** Chips, Einsätze, Runden, Kategorien und Auswertung als reines TypeScript, testgetrieben
- [ ] **Phase 2 – Spielraum online:** Raumcode, Echtzeit über WebSockets und Durable Objects, Rollen Quiz-Master und
  Spieler, Rückkehr nach Abbruch, ein fest eingebautes Beispiel-Quiz, erste Veröffentlichung bei Cloudflare
- [ ] **Phase 3 – Quiz-Sammlung:** Konten, Editor, D1, öffentliche und private Quizze, Kopien, Schutzregeln
- [ ] **Phase 4 – Spieleabend:** echter Test mit Freunden, Feinschliff (z. B. fürs Handy)

**Für später:** Modus gegen andere Spieler (Pot), Fernseher-Ansicht, Timer, einstellbare Startchips und Einsatzgrenzen,
Export eines Quiz als Datei, private Quizze mit einzelnen Freunden teilen.

## Stolpersteine

- **Vitest-Version:** Das Testwerkzeug `@cloudflare/vitest-plugin` verlangt laut Doku Vitest 4.1, das aktuelle Vitest 5
  passt nicht dazu. Vor einem Update prüfen (siehe [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]]).
- **Kostenloser Tarif:** Durable Objects nur mit SQLite-Speicher, 100.000 Anfragen pro Tag. Darüber schlagen Aufrufe fehl.
  Für eine Freundesrunde reicht das, Stand 2026-11-02.
- **Schummeln:** Alles, was im Browser ankommt, ist einsehbar. Deshalb gehen Lösungen erst bei der Auflösung hinaus.
- **Vor Phase 2 beachten:** `aktuelleRunde` liefert immer auch die Musterlösung, sie darf nur über die Ansicht je Rolle hinausgehen.
  Spieler-IDs müssen vom Server kommen: `constructor` als ID würde die Chips zerstören, weil Einträge aus normalen Objekten gelesen
  werden. Beides braucht in Phase 2 einen Test.
- **Abbrüche:** Handys verlieren beim Sperren die Verbindung, Spieler müssen ohne Konto zurück in den Raum finden.
- **Fragen und Antworten:** Quizfragen aus fremden Quellen nicht ungeprüft veröffentlichen, das Repo bleibt privat.
- **Betreiberpflichten:** Fremde können Inhalte einstellen, und Konten speichern E-Mail-Adressen. Impressum, Datenschutz und
  Umgang mit Inhalten vor der Veröffentlichung von Phase 3 klären.

## Offene Fragen

- Welcher Dienst verschickt die E-Mails zum Zurücksetzen? (Auswahl im Plan für Phase 3.)
- Wie startet das Spiel im Launcher genau? (Annahme: über die Web-Adresse.)
