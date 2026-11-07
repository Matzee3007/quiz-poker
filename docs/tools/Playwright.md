---
titel: Playwright
status: aktiv
erstellt: 2026-11-07
tags: [tools, playwright, tests, browser]
---

# Playwright

**Playwright** steuert einen echten Browser per Code: Seiten öffnen, Felder ausfüllen, Knöpfe drücken und prüfen, was
zu sehen ist. Damit prüfen wir die Oberfläche so, wie ein Mensch sie benutzt. Vitest prüft dagegen Regeln und Server
ohne Browser. Gehört zu [[projects/quiz-poker/docs/tools/Tools Übersicht|Tools Übersicht]].

## Wofür wir es nutzen

Ein Browser-Durchlauf in `browser/durchlauf.spec.ts`. Mit Konto: registrieren, abmelden, anmelden, Quiz anlegen,
unfertig speichern, neu laden, fertig schreiben, Rückfrage im Editor, Spielraum eröffnen, veröffentlichen, die Sammlung
ohne Konto, Kopieren mit einem zweiten Konto, privat stellen während die Sammlung offen ist, öffentliches Quiz im Editor,
Beispiel-Quiz als Vorlage und Konto löschen. Ohne Konto:
Beispiel-Quiz und Einmal-Quiz eröffnen je einen Spielraum. Bis Schritt 3 von Phase 3 lag dieses Skript nur im
Scratchpad, seit 2026-11-07 liegt es im Repo.

## Wichtige Begriffe

- **Locator:** beschreibt, wie ein Element gefunden wird, z. B. `page.getByRole("button", { name: "Speichern" })`
  oder `page.getByLabel("E-Mail")`. Wir suchen nach sichtbarem Text und Beschriftungen, nicht nach CSS-Klassen. So
  bricht der Test nicht bei jeder Stiländerung.
- **`expect(...).toBeVisible()`:** wartet von selbst bis zu 5 Sekunden, bis das Element erscheint. Ein `sleep` ist
  deshalb nie nötig.
- **Serieller Block:** `test.describe.configure({ mode: "serial" })` lässt die Tests „mit Konto“ nacheinander auf
  derselben Seite laufen. Schlägt einer fehl, laufen die folgenden nicht (`did not run`).
- **`webServer`:** In `playwright.config.ts` startet Playwright den lokalen Server selbst (`npx vite --strictPort`), falls
  auf Port 5173 noch nichts läuft. Läuft der Server schon, nimmt Playwright ihn (`reuseExistingServer`).

## Wie wir es eingerichtet haben

- Warum von Hand, feste Version und nur Chromium: [[projects/quiz-poker/docs/adr/0007-browser-durchlauf-mit-playwright|ADR 0007]].
- `@playwright/test` **1.64.1, ohne `^`:** Jede Playwright-Version gehört zu genau einer Browser-Version. 1.64.1
  passt zu `chromium-1248`, das schon unter `~/Library/Caches/ms-playwright` lag. Ein Update von Playwright lädt neue
  Browser (`npx playwright install chromium`), deshalb ist die Version festgelegt.
- Nur Chromium. Für eine Freundesrunde reicht ein Browser.
- **Nicht in `npm run check` und nicht in der CI:** Der Durchlauf braucht den lokalen Server, eine lokale D1 mit allen
  Migrationen und erzeugt eine Einladung. Er läuft von Hand vor einem PR, der die Oberfläche ändert.
- Jeder Lauf erzeugt eine eigene Einladung (`node scripts/einladung.ts --lokal`) und ein eigenes Konto
  `test-<Zeit>@beispiel.de`. Am Ende löscht der Test das Konto über die Oberfläche. `afterAll` löscht es zusätzlich direkt
  in der lokalen D1, damit auch ein abgebrochener Lauf kein Konto liegen lässt. Nur das eigene, so stören sich zwei
  gleichzeitige Läufe nicht. Einladungen bleiben in der lokalen D1 liegen, das ist harmlos.
- Ergebnisse landen in `test-results/` und `playwright-report/`, beide in `.gitignore` und bei ESLint ausgenommen.

## Befehle

```bash
npm run test:browser                          # Durchlauf starten, startet bei Bedarf den lokalen Server
npx playwright test --headed                  # Mit sichtbarem Browserfenster, zum Zuschauen
npx playwright test -g "Einmal-Quiz"          # Nur Tests, deren Name den Text enthält
npx playwright show-trace test-results/<ordner>/trace.zip   # Ablauf eines fehlgeschlagenen Tests ansehen
npx playwright install --dry-run chromium     # Zeigt, welcher Browser-Ordner zur installierten Version gehört
npx wrangler d1 migrations apply quiz-poker --local   # Lokale D1 auf den Stand der Migrationen bringen
```

## Fehler

- **Ein Test schlägt fehl, die folgenden zeigen `did not run`:** Das ist der serielle Block, kein zweiter Fehler.
  Ursache steht beim ersten roten Test. Unter `Error Context` liegt eine Datei mit dem Seiteninhalt zum Zeitpunkt des Fehlers.
- **`no such table: quiz` oder ähnlich:** Die lokale D1 kennt eine neue Migration noch nicht. Lösung:
  `npx wrangler d1 migrations apply quiz-poker --local`.
- **Die Raum-Tests scheitern mit „Gerade wurden zu viele Spielräume eröffnet“:** Jeder Lauf eröffnet fünf Spielräume, lokal
  gilt dieselbe Grenze wie online (`RAEUME_PRO_STUNDE`: 30 pro Stunde in `wrangler.jsonc`). Nach sechs Läufen in einer
  Stunde ist sie erreicht. Lösung: in `.dev.vars` die Zeile `RAEUME_PRO_STUNDE=1000` ergänzen und den Server neu starten.
  `.dev.vars` gilt nur lokal und steht nicht im Repo.
- **`Timed out waiting … from config.webServer` oder `Port 5173 is already in use`:** Ein anderes Programm belegt Port 5173.
  Lösung: das andere Programm beenden (`lsof -i :5173` zeigt es).
- **`Executable doesn't exist at …/chromium-…`:** Die installierte Playwright-Version erwartet einen anderen
  Browser-Ordner. Lösung: `npx playwright install chromium` oder die Version passend zum vorhandenen Ordner wählen.
