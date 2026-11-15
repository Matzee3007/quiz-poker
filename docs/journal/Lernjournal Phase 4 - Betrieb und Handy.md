---
titel: Lernjournal Phase 4 - Betrieb und Handy
status: aktiv
phase: 4
erstellt: 2026-11-15
tags: [lernjournal, phase-4, cloudflare, github-actions, playwright, webkit, css, handy]
---

# Lernjournal Phase 4: Betrieb und Handy

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 3 - AGENTS und Playwright|Lernjournal Phase 3 - AGENTS und Playwright]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

Die Session lief vom 2026-11-09 bis 2026-11-15.

## Erledigt

- [x] Restpunkt aus der Übergabe: Der tägliche Lauf (Cron) läuft. Belegt über die Analytics von Cloudflare: täglich um
  03:17 UTC mit `success`.
- [x] Restpunkt aus der Übergabe: Audit-Fund `worker/spielraum.ts:234` geprüft, kein Fehler. Ein Kommentar über
  `acceptWebSocket` erklärt jetzt, warum erst angenommen und dann geprüft wird.
- [x] Datenschutzseite um den Abschnitt „Sicherungen“ ergänzt (D1 Time Travel 7 Tage), siehe
  [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen|ADR 0009]]
- [x] `npm run cron-pruefen` und GitHub Action `cron-pruefen.yml`: prüft täglich um 05:00 UTC, ob der Lauf der letzten
  24 Stunden erfolgreich war
- [x] PR #31 mit `/code-review` (Funde 1 bis 8 und 10 behoben), gemergt und deployt
- [x] Mock fürs Handy, Variante A (Rangliste als Leiste oben) freigegeben, Plan
  [[projects/quiz-poker/docs/plaene/2026-11-09-handy-layout|Handy-Layout]] geschrieben und freigegeben
- [x] Handy-Layout umgesetzt: Block `@media (max-width: 700px)`, `RanglisteLeiste.svelte`, klebender Hauptknopf,
  Auflösung als Liste, `platzVon` mit Gleichstand in `src/regeln/ansicht.ts`
- [x] Playwright-Projekt `handy` in WebKit, siehe [[projects/quiz-poker/docs/adr/0010-webkit-fuer-handy-durchlauf|ADR 0010]]
- [x] Abnahme am eigenen iPhone über den lokalen Server im WLAN: „passt“
- [x] PR #32: `/code-review` mit 10 Funden (7 behoben, 1 Fehlalarm, 2 bewusst gelassen), `plan-pruefer` mit 4
  Abweichungen vom Wortlaut (Plan und ADR angepasst), CI grün, gemergt, deployt (Version `db060a61`)
- [x] Projekt-`CLAUDE.md`: Zeile zu `.dev.vars` und Browsern vor `npm run test:browser`
- [ ] Spieleabend mit Freunden (der eigentliche Test von Phase 4)

## Entscheidungen

| Art | Entscheidung | Warum | Wer |
|---|---|---|---|
| Betrieb | Vor Phase 4 erst den Betrieb absichern | Der Lösch-Cron und die Datenschutzzusage sollten belegt sein, bevor Freunde spielen | Entwickler |
| Betrieb | Datenschutzseite nennt die Sicherungen von Cloudflare ehrlich mit Frist | [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen\|ADR 0009]] | Entwickler |
| Betrieb | Eine GitHub Action prüft täglich den Lösch-Cron über die Analytics | [[projects/quiz-poker/docs/adr/0009-sicherungen-und-loeschfristen\|ADR 0009]] | Entwickler |
| Prüfen | Nur der neueste Lauf der letzten 24 Stunden zählt | Ein Fenster von 26 Stunden mit „irgendein Lauf erfolgreich“ hätte einen Ausfall übersehen (Review-Fund) | Entwickler |
| Design | Handy: Rangliste als Leiste oben, aufklappbar (Variante A) | Mock verglichen | Entwickler |
| Prüfen | WebKit für den Handy-Durchlauf, Chromium bleibt für den Rest | [[projects/quiz-poker/docs/adr/0010-webkit-fuer-handy-durchlauf\|ADR 0010]] | Entwickler |
| Design | Über 700 px gilt wieder die Mindestbreite von 1100 px | Sonst sahen Fenster von 701 bis 1099 px weder aus wie vorher noch wie am Handy (Review-Fund 1) | Entwickler |
| Design | Auflösung am Handy mit drei Zeilen je Spieler statt zwei | Lange Antworten bekommen die volle Breite | Entwickler |
| Design | Leistenknopf ohne `aria-label` | VoiceOver liest so Platz und Chips mit vor | Entwickler |
| Design | „Beitreten“ steht am Handy nur per CSS (`order`) oben, nicht im Markup | Markup umstellen hätte den Desktop geändert; Tab-Reihenfolge am Handy kaum relevant (Review-Fund 9 gelassen) | Entwickler |

## Befehle: Cloudflare Analytics und Cron

```bash
npm run cron-pruefen
/usr/bin/curl -s -H "Authorization: Bearer $(cat ~/.cloudflare-analytics-token)" https://api.cloudflare.com/client/v4/graphql --data '…'
```

- `npm run cron-pruefen`: fragt die Analytics ab, ob der tägliche Lauf in den letzten 24 Stunden erfolgreich war. Braucht
  `CLOUDFLARE_ANALYTICS_TOKEN` und `CLOUDFLARE_ACCOUNT_ID`.
- GraphQL-Abfrage an Cloudflare mit eigenem Token („Account Analytics: Read“). Das Token liegt nur in einer Datei und wird
  nie ausgegeben.

## Befehle: Handy testen

```bash
npx vite --host --strictPort
npx playwright install webkit
npx playwright test --project handy
npm run deploy
```

- `npx vite --host --strictPort`: lokaler Server, auch für Geräte im eigenen WLAN erreichbar. So ließ sich das iPhone
  testen, ohne Ungemergtes zu deployen.
- `npx playwright install webkit`: lädt WebKit passend zu Playwright 1.64.1 (Ordner `webkit-2370`).
- `npx playwright test --project handy`: nur die drei Handy-Tests.
- `npm run deploy`: vom Entwickler selbst ausgeführt, der Auto-Modus darf nicht deployen.

## Neu gelernt

### Cloudflare GraphQL Analytics

Die Anmeldung von `wrangler` reicht für die Analytics nicht (`Authentication error`), es braucht ein eigenes API-Token.
Läufe des Crons stehen in `workersInvocationsAdaptive` mit `eventType: "cron"`. Eine Abfrage darf höchstens eine Woche
umfassen.

### `display: contents`

Das Element verschwindet aus dem Layout, seine Kinder rücken eine Ebene nach oben. So kam der Hauptknopf am Handy ans Ende
der Karte, ohne das Markup zu ändern.

### Tabelle als Liste per CSS-Grid

Mit `display: grid` und `grid-template-areas` am `tr` wird jede Tabellenzeile am Handy zu einem Block mit mehreren Zeilen.
Eine Zelle ohne eigenen Bereich landet automatisch in einer freien Zelle, deshalb braucht jede Zelle eine Klasse.

### Projekt-Einstellungen in Playwright

Was unter `use` eines Projekts steht, gilt auch für Kontexte, die ein Test selbst mit `browser.newContext()` öffnet.
Ein Desktop-Kontext im Projekt `handy` braucht deshalb ausdrücklich `devices["Desktop Safari"]`.

### `locator.all()` wartet nicht

Anders als `click()` liefert `all()` sofort, was gerade da ist, notfalls nichts. Für Elemente, die erst erscheinen,
`nth(0)` und `nth(1)` nehmen.

### `order` ändert nur das Aussehen

CSS-`order` verschiebt Elemente nur auf dem Bildschirm. Tastatur und Screenreader folgen weiter dem Markup.

## Fehler und Lösungen

### `Authentication error` (Code 10000) bei der GraphQL-API

- **Wo:** Abfrage der Analytics mit der OAuth-Anmeldung von `wrangler`
- **Ursache:** Das OAuth-Token hat kein Recht auf die Analytics
- **Lösung:** eigenes API-Token mit „Account Analytics: Read“, gespeichert in `~/.cloudflare-analytics-token`
- **Prüfen:** `npm run cron-pruefen` meldet „Täglicher Lauf in den letzten 24 Stunden: erfolgreich.“

### `quota` bei der GraphQL-API

- **Wo:** Abfrage über mehr als eine Woche
- **Ursache:** Die Analytics erlauben höchstens eine Woche je Abfrage
- **Lösung:** Zeitraum verkürzt
- **Prüfen:** Abfrage liefert Daten statt Fehler

### `curl: (77) error adding trust anchors from file: /opt/anaconda3/ssl/cacert.pem`

- **Wo:** `curl` im Terminal des Entwicklers
- **Ursache:** Das `curl` aus Anaconda findet seine Zertifikate nicht
- **Lösung:** `/usr/bin/curl` verwenden
- **Prüfen:** Abfrage läuft ohne Exit-Code 77

### `Executable doesn't exist at …/chromium_headless_shell-1248`

- **Wo:** `npm run test:browser`
- **Ursache:** vermutlich ein anderes Projekt mit neuerem Playwright, das den Ordner aufgeräumt hat
- **Lösung:** `npx playwright install chromium`
- **Prüfen:** Browser-Durchlauf startet

### „Gerade wurden zu viele Spielräume eröffnet“

- **Wo:** Browser-Durchlauf, zum zweiten Mal
- **Ursache:** Jeder Lauf eröffnet acht Räume, lokal gilt die Grenze von 30 pro Stunde
- **Lösung:** `RAEUME_PRO_STUNDE=1000` in `.dev.vars`, Server neu starten. Seit dieser Session steht der Hinweis in der
  Projekt-`CLAUDE.md`
- **Prüfen:** `npm run test:browser` 15 von 15 grün

### `page.goto: Test ended` (Timeout nach 30 Sekunden)

- **Wo:** dritter Handy-Test, nur im kompletten Lauf
- **Ursache:** Offene Browser-Kontexte der vorigen Tests hielten ihre WebSockets
- **Lösung:** alle Kontexte in `test.afterEach` schließen
- **Prüfen:** zwei komplette Läufe hintereinander grün

### Seite 388 px statt 375 px breit

- **Wo:** Warten-Ansicht am Handy
- **Ursache:** Die Zeile mit dem Einladungslink brach nicht um
- **Lösung:** `.reihe` am Handy mit Umbruch und `overflow-wrap`
- **Prüfen:** `ohneSeitlichesScrollen` im Handy-Test grün

### `Error: Test timed out in 5000ms.` in `worker/auth.test.ts`

- **Wo:** `npm run check` nach den Review-Fixes
- **Ursache:** Das Passwort-Hashing ist rechenintensiv, der Rechner war gerade ausgelastet. Die Datei war nicht geändert
- **Lösung:** erneut ausgeführt, einzeln und im kompletten Lauf grün
- **Prüfen:** `npm run check`: 394 Tests grün

## Aus dem Chat

-

## Offene Fragen

- Wie oft läuft `auth.test.ts` in den Timeout? Einmal beobachtet, noch kein Muster.

## Nächste Schritte

1. Spieleabend mit Freunden: echter Test von Phase 4, Beobachtungen festhalten
2. Danach Feinschliff aus den Beobachtungen, Quiz-Master-Ansichten am Handy nur bei Bedarf
