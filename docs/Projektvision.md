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
Chips hat. Spieler treten als Gäste per Link und Raumcode bei, der Quiz-Master leitet die Partie mit oder ohne Konto, jeder
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

## Spielraum online (Phase 2)

- **Oberfläche:** vollständig spielbar im Browser am PC. Das Handy ist vorerst nicht nötig, es folgt beim Feinschliff in Phase 4.
- **Aussehen:** Stil C, dunkles modernes Casino, aus dem [[projects/quiz-poker/docs/mocks/2026-11-03-spielraum.html|Mock]]: feste Rangliste, große Einsatzzahl in Gold, Tabelle für die Auswertung.
- **Eröffnen und beitreten:** Jeder kann ohne Passwort einen Spielraum eröffnen und ist dann dessen Quiz-Master. Der Raumcode besteht aus
  4 Großbuchstaben ohne verwechselbare wie O und I, der Link `/raum/ABCD` führt direkt dorthin.
- **Nachrichten:** Das Gerät schickt nur Aktionen, der Server antwortet allen mit ihrer kompletten Ansicht.
- **Ansicht je Rolle:** Spieler sehen die Frage ab der Antwortphase, Musterlösung sowie fremde Einsätze und Antworten ab der Auflösung,
  vorher nur „hat gesetzt“ oder „bereit“. Der Quiz-Master sieht immer alles. Später Einsteigende sehen dasselbe wie Spieler, ohne
  Eingabefelder. Das regelt eine getestete reine Funktion in `src/regeln/`.
- **Gerät verloren:** Ein Spieler gibt am neuen Gerät Raumcode und Namen ein, der Quiz-Master bestätigt, danach gilt nur noch das neue
  Gerät. Die erste Anfrage gilt, solange ihr Gerät verbunden ist, und der Quiz-Master sieht nur Anfragen verbundener Geräte. Verliert der Quiz-Master sein Gerät, ist die Partie in Phase 2 verloren.
- **Ende:** Ein Raum wird gelöscht, wenn der Quiz-Master ihn schließt oder 24 Stunden lang keine Aktion stattfand.
- **Grenzen:** Namen höchstens 20, Antworten höchstens 200 Zeichen. Höchstens 30 neue Spielräume pro Stunde, damit ein Skript nicht das
  Tageslimit aufbraucht. Laufende Partien sind davon nicht betroffen. Beitritte und Aktionen in einem Raum sind nicht begrenzt.
- **Beispiel-Quiz:** 3 Kategorien mit je 3 Runden, selbst formulierte Fragen.
- **Veröffentlichen:** per Hand mit `npm run deploy` auf der Adresse `https://quiz-poker.quiz-poker.workers.dev`.

## Quiz-Sammlung

- Gespeicherte Quizze gehören dem Konto ihres Erstellers ([[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]])
  und liegen in D1 ([[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]]), der Inhalt als JSON in einem Feld.
- Konten gibt es nur mit Einladungscode, E-Mails werden nicht verschickt
  ([[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]).
- **Ohne Konto** lässt sich ein Spielraum mit einem Einmal-Quiz, dem Beispiel-Quiz oder einem öffentlichen Quiz öffnen. Der
  Entwurf eines Einmal-Quiz liegt bis dahin nur im Browser.
- **Der Spielraum kopiert das Quiz beim Öffnen.** Bearbeiten oder Löschen ändert eine laufende Partie nicht.
- Ein privates Quiz kann nur sein Ersteller sehen und bearbeiten. Es darf unfertig gespeichert werden. Zum Spielen und
  Veröffentlichen braucht es mindestens eine Kategorie, je Kategorie mindestens eine Frage und keine leeren Felder.
- Ein öffentliches Quiz kann jeder in der Sammlung mit Titel und Kategorien sehen und spielen, die neuesten zuerst. Der Ersteller
  wird nicht angezeigt. Mit einem Konto lässt es sich als eigene Kopie übernehmen. Die Kopie ist unabhängig vom Original und
  zunächst privat. Der Ersteller kann es jederzeit wieder auf privat stellen.
- Das Beispiel-Quiz bleibt im Code und lässt sich mit Konto als Vorlage kopieren. Es kann später entfallen.
- Schutzregeln: Neue Quizze sind zunächst privat, und der Server prüft die Grenzen, auch beim Einmal-Quiz: höchstens 10 Kategorien,
  10 Fragen je Kategorie, 300 Zeichen je Frage, 100 Zeichen je Musterlösung, 20 gespeicherte Quizze je Konto.
- **Konto:** Eine Anmeldung gilt 30 Tage, Passwörter haben mindestens 8 Zeichen, Fehlversuche werden je IP-Adresse begrenzt. Wer
  sein Konto löscht, löscht auch alle seine Quizze, Kopien anderer bleiben.
- **Betreiber:** Einladungscode (gültig bis zur Nutzung), Link zum Zurücksetzen (24 Stunden) und das Löschen eines Quiz laufen über
  dokumentierte Befehle, ohne Admin-Seite.
- **Vor der Veröffentlichung der Konten:** Kurze Datenschutzhinweise online, kein Impressum
  ([[projects/quiz-poker/docs/adr/0006-kein-impressum|ADR 0006]]), Cloudflare Security Audit Skill einmal
  ausführen. Jeder PR ab den Konten bekommt zusätzlich `/security-review`.
- Bewusst hingenommen: Bei öffentlichen Quizzen kann ein Mitspieler vorab die Lösungen sehen. Wer sichergehen will, nimmt ein
  eigenes privates Quiz oder ein Einmal-Quiz.

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
| Quiz-Sammlung und Konten (ab Phase 3) | Cloudflare D1, Better Auth |
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
6. **Konten nur für Quiz-Master:** [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]], mit Einladung und
   ohne E-Mail-Versand: [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]].
   Kein Impressum: [[projects/quiz-poker/docs/adr/0006-kein-impressum|ADR 0006]].
7. **Spielstand und Hibernation:** [[projects/quiz-poker/docs/adr/0004-spielstand-und-hibernation|ADR 0004]].

## Roadmap

Jede Phase endet mit etwas, das läuft und getestet ist. Eine fertige Phase wird in derselben Session
abgeschlossen (Regel „Phasenwechsel“ in der globalen `CLAUDE.md`).

- [x] **Phase 0 – Fundament:** Repo und `CLAUDE.md` stehen, Stack eingerichtet, erster Test grün,
  Projektvision mit `/grill-with-docs` geschärft, Phasen 1 bis 4 geplant
- [x] **Phase 1 – Regelkern:** Chips, Einsätze, Runden, Kategorien und Auswertung als reines TypeScript, testgetrieben
- [x] **Phase 2 – Spielraum online:** Raumcode, Echtzeit über WebSockets und Durable Objects, Rollen Quiz-Master und
  Spieler, Rückkehr nach Abbruch, ein fest eingebautes Beispiel-Quiz, erste Veröffentlichung bei Cloudflare
- [ ] **Phase 3 – Quiz-Sammlung:** in vier Schritten: (1) Editor und Einmal-Quiz im Spielraum (online seit 2026-11-04), (2) Konten mit Einladungscode,
  (3) Quizze in D1 speichern, (4) öffentliche Quizze, Kopien und Schutzregeln
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
- **Betreiberpflichten:** Eingeladene können Inhalte einstellen, und Konten speichern E-Mail-Adressen. Ob eine frei erreichbare
  Seite für Freunde ein Impressum braucht, ließ sich nicht klären. Der Entwickler verzichtet darauf und trägt das Risiko
  ([[projects/quiz-poker/docs/adr/0006-kein-impressum|ADR 0006]]).
- **Rechenzeit:** Ein Worker darf im kostenlosen Tarif 10 ms je Anfrage rechnen, Passwort-Hashing läuft deshalb in einem Durable
  Object. Vor dem Bau der Konten im echten Betrieb messen.

## Offene Fragen

- Wie startet das Spiel im Launcher genau? (Annahme: über die Web-Adresse.)
