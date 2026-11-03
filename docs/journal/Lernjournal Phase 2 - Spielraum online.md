---
titel: Lernjournal Phase 2 - Spielraum online
status: aktiv
phase: 2
erstellt: 2026-11-03
tags: [lernjournal, phase-2, durable-objects, websockets, svelte, playwright]
---

# Lernjournal Phase 2: Spielraum online

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 1 - Regelkern|Lernjournal Phase 1 - Regelkern]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Umfang mit `/grill-with-docs` geklärt, Mock mit drei Stilen gebaut, Stil C gewählt, [[projects/quiz-poker/docs/adr/0004-spielstand-und-hibernation|ADR 0004]] geschrieben
- [x] Plan geschrieben: [[projects/quiz-poker/docs/plaene/2026-11-03-spielraum-online|Plan: Spielraum online]]
- [x] Server: Durable Object je Spielraum mit Hibernation, Raumcode, Ansicht je Rolle, Rechte, Rückkehr, Raumende, Grenze für neue Räume (PR #7)
- [x] Oberfläche im Stil C mit Neuverbinden, Podest und Rangliste (PR #8)
- [x] 157 Tests grün, CI grün, ganze Partien und Sonderfälle im echten Browser durchgespielt
- [ ] Erste Veröffentlichung bei Cloudflare: Konto, `npx wrangler login`, `npm run deploy` macht der Entwickler
- [ ] Partie über die öffentliche Adresse spielen und Phase 2 abschließen

## Entscheidungen

- Oberfläche vorerst nur für den PC, das Handy folgt in Phase 4.
- Jeder kann ohne Passwort einen Spielraum eröffnen, höchstens 30 neue Räume pro Stunde.
- Das Gerät schickt nur Aktionen, der Server antwortet allen mit ihrer ganzen Ansicht.
- Bei einer Rückkehr gilt die erste Anfrage, solange ihr Gerät verbunden ist, und der Quiz-Master muss bestätigen.
- Der Quiz-Master verliert mit seinem Gerät in Phase 2 die Partie, das Konto kommt in Phase 3.
- Eigener Zähler als Durable Object statt Rate-Limiting-Binding: Die Doku bestätigt das Binding nicht für den kostenlosen Tarif, und es zählt nur ungefähr und je Standort.

## Befehle: Durable Objects testen

```bash
npm install -D @cloudflare/vitest-plugin
npm test -- worker/spielraum.test.ts
npx vitest run worker
```

- `npm install -D @cloudflare/vitest-plugin`: Tests laufen damit in `workerd`, der Laufzeit von Cloudflare.
- `npm test -- <datei>`: nur diese Testdatei ausführen, für die Rot-Grün-Schleife.
- `npx vitest run worker`: nur die Server-Tests. Lief 25-mal hintereinander, um die Zuverlässigkeit zu prüfen.

## Befehle: Noch offen

```bash
npx wrangler login
npm run deploy
```

- `npx wrangler login`: verbindet `wrangler` im Browser mit dem Cloudflare-Konto.
- `npm run deploy`: baut das Spiel und lädt es hoch, danach ist die Seite öffentlich erreichbar.

## Neu gelernt

### Hibernation

Ein Durable Object darf im Leerlauf schlafen, die Verbindungen bleiben offen. Dabei geht der Arbeitsspeicher verloren. Deshalb liest jede Aktion den Stand aus dem Speicher, und Daten je Verbindung stehen in `serializeAttachment`. `evictDurableObject` stellt das Einschlafen im Test nach.

### Rechte hängen an der Verbindung

Eine Aktion gilt immer für das Token der Verbindung, nie für eine mitgeschickte ID. Dabei reicht es nicht, die Rolle beim Verbinden zu prüfen: Vor jeder Aktion wird das Token gegen den gespeicherten Stand geprüft, sonst könnte ein ersetztes Gerät noch etwas auslösen.

### Plain Objects und fremde Schlüssel

`constructor` als Schlüssel findet auf einem normalen Objekt eine geerbte Funktion. Tokens werden deshalb mit `Object.hasOwn` gesucht.

### Browsertests finden, was Unit-Tests nicht sehen

Die Server-Tests waren grün, trotzdem kam das Schließ-Signal im Browser erst nach rund 10 Sekunden an. Auch das Layout mit langen Antworten fiel erst im Browser auf. Das Playwright-Skript lief außerhalb des Repos.

### Prüfungen selbst prüfen

Die Lösungssuche im Browser stand in einer Funktion, die nie aufgerufen wurde, und meldete trotzdem „Probleme: 0“. Das fiel erst dem `plan-pruefer` auf. Danach lief sie mit 54 Prüfungen über alle 9 Runden.

## Fehler und Lösungen

### Tests schlagen gelegentlich fehl: `QQQQ` liefert 201 statt 404

- **Wo:** `npm run check`, bei 6 von 40 Läufen des `plan-pruefer`.
- **Ursache:** Ein Test nahm einen festen Code als unbekannten Raum, ein anderer erzeugte mit gefälschtem Zufall genau solche Räume, und mit `isolate: false` teilen sich die Tests den Speicher. Den Fehlschlag mit `QQQX` erklärt das nicht, die Ursache dort ist nur vermutet.
- **Lösung:** Zufälliger Raumcode für unbekannte Räume, der Zufall wird im Test nur noch für die ersten vier Aufrufe gefälscht.
- **Prüfen:** `npx vitest run worker` lief 25-mal ohne Fehlschlag. Ein Restrisiko von etwa 0,02 % je Lauf bleibt.

### Commit und Push trotz rotem `npm run check`

- **Wo:** Commit „Limit new rooms per hour“.
- **Ursache:** In der Befehlskette standen `npm run check` und `git commit` ohne Abhängigkeit, ein Typfehler im Test (`Type '"0"' is not assignable to type '"30"'`) stoppte also nichts.
- **Lösung:** Typfehler im Folgecommit behoben, ab dann nur noch `if npm run check …; then git commit …`.
- **Prüfen:** `gh run list --branch main --limit 1`

### Antwort auf eine schließende Verbindung wirft einen Fehler

- **Wo:** `webSocketMessage`, wenn eine Nachricht auf einer gerade geschlossenen Verbindung eintrifft. Ein Test hat das bestätigt.
- **Ursache:** `send` wirft nach `close`.
- **Lösung:** `senden` prüft zuerst `readyState`.
- **Prüfen:** Test „stürzt nicht ab, wenn die Antwort auf eine schließende Verbindung ginge“.

### Schließ-Signal kommt im Browser rund 10 Sekunden zu spät

- **Wo:** Ein entfernter Spieler sah im lokalen Dev-Server noch rund 10 Sekunden lang das Spiel.
- **Ursache:** nicht geklärt, auch nicht, ob es bei Cloudflare ebenso passiert.
- **Lösung:** Der Server schickt vorher die Nachricht `{ typ: "beendet", code }`.
- **Prüfen:** Test „kündigt das Schließen als Nachricht an …“ und Spieler im Browser entfernen.

## Aus dem Chat

-

## Offene Fragen

- Läuft bei Cloudflare alles wie lokal, vor allem WebSockets, Hibernation und das Schließ-Signal?
- Beitritte und Aktionen in einem Raum sind nicht begrenzt, nur neue Räume.
- Das echte Kopieren des Links ist nicht belegt, im Testbrowser meldete der Knopf „Bitte von Hand kopieren“.
- Die letzten Korrekturen an PR #8 sind per Tests, Browser und `plan-pruefer` geprüft, aber nicht noch einmal per `/code-review`, wie abgesprochen.

## Nächste Schritte

1. Cloudflare-Konto anlegen, `npx wrangler login`, `npm run deploy`.
2. Partie über die öffentliche Adresse spielen, Adresse in die Doku eintragen.
3. Phase 2 abschließen, danach fragen, was vor Phase 3 ansteht.
