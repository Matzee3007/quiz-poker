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
Chips hat. Quiz-Master und Spieler treten per Link und Raumcode bei, jeder am eigenen Gerät.

Der spätere Game-Launcher (im Ecosystem vorgemerkt) soll das Spiel über seine Web-Adresse öffnen, eine eigene
Installation ist dafür nicht nötig.

Ausdrücklich nicht: öffentliche Plattform, Benutzerkonten für Spieler, Echtgeld (Chips sind reine Spielpunkte).

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
| Hosting | Cloudflare (kostenloser Tarif), `wrangler` |
| Tests | Vitest 4 |
| Qualität | ESLint, Prettier, `svelte-check` |

## Architekturentscheidungen

1. **Der Server ist die Wahrheit:** Spielstand, Einsätze und Lösungen liegen auf dem Server, der Browser bekommt nur, was
   seine Rolle sehen darf.
2. **Regeln ohne Technik:** Die Spielregeln sind reines TypeScript und werden testgetrieben entwickelt.
3. **Ein Raum, ein Durable Object:** Jeder Spielraum hat genau ein Objekt, das seinen Zustand verwaltet.
4. **Stack:** [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].

## Roadmap

Jede Phase endet mit etwas, das läuft und getestet ist. Eine fertige Phase wird in derselben Session
abgeschlossen (Regel „Phasenwechsel“ in der globalen `CLAUDE.md`).

- [ ] **Phase 0 – Fundament:** Repo und `CLAUDE.md` stehen, Stack eingerichtet, erster Test grün,
  Projektvision mit `/grill-with-docs` geschärft, Phasen 1 bis 4 geplant
- [ ] **Phase 1 – Regelkern:** Chips, Einsätze, Runden und Kategorien als reines TypeScript, testgetrieben
- [ ] **Phase 2 – Spielraum online:** Raumcode, Echtzeit über WebSockets und Durable Objects, Rollen Quiz-Master und
  Spieler, erste Veröffentlichung bei Cloudflare
- [ ] **Phase 3 – Quiz-Editor:** Der Quiz-Master erstellt Kategorien, Runden, Fragen und Antworten
- [ ] **Phase 4 – Spieleabend:** echter Test mit Freunden, Feinschliff (z. B. fürs Handy)

## Stolpersteine

- **Vitest-Version:** Das Testwerkzeug `@cloudflare/vitest-plugin` verlangt laut Doku Vitest 4.1, das aktuelle Vitest 5
  passt nicht dazu. Vor einem Update prüfen (siehe [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]]).
- **Kostenloser Tarif:** Durable Objects nur mit SQLite-Speicher, 100.000 Anfragen pro Tag. Darüber schlagen Aufrufe fehl.
  Für eine Freundesrunde reicht das, Stand 2026-11-02.
- **Schummeln:** Alles, was im Browser ankommt, ist einsehbar. Deshalb gehen Lösungen erst bei der Auflösung hinaus.
- **Abbrüche:** Handys verlieren beim Sperren die Verbindung, Spieler müssen ohne Konto zurück in den Raum finden.
- **Fragen und Antworten:** Quizfragen aus fremden Quellen nicht ungeprüft veröffentlichen, das Repo bleibt privat.

## Offene Fragen

- Was bringt ein richtiger Einsatz genau? Bei 5 gesetzten Chips entweder 10 auf der Hand (Einsatz zurück plus 5, Stand +5)
  oder 10 zusätzlich (Stand +10).
- Müssen alle gleichzeitig und geheim setzen? Gibt es einen Mindest- oder Höchsteinsatz?
- Wie viele Chips gibt es am Anfang, und was passiert bei 0 Chips?
- Antworten die Spieler per Auswahl oder als Freitext, und wer entscheidet dann über richtig oder falsch?
- Spielt der Quiz-Master selbst mit? (Annahme: nein, er kennt die Lösungen.)
- Wie erkennt der Server einen Spieler nach einem Verbindungsabbruch wieder, ohne Konten?
- Wo werden fertige Quizze gespeichert, und kann man sie wiederverwenden?
- Wie startet das Spiel im Launcher genau? (Annahme: über die Web-Adresse.)
