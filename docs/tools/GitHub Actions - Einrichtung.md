---
titel: GitHub Actions - Einrichtung
status: aktiv
erstellt: 2026-11-03
tags: [tools, github, ci, einrichtung]
---

# GitHub Actions: Einrichtung in Quiz-Poker

Teil der [[projects/quiz-poker/docs/tools/Tools Übersicht|Tools Übersicht]]. Begriffe, Befehle und allgemeine Fehler stehen in
der Werkzeug-Notiz des Ecosystems: [[GitHub Actions]]. Hier steht nur, wie es in diesem Projekt eingerichtet ist.

## Was prüft die CI?

Workflow `.github/workflows/ci.yml`, Job `check`, bei jedem Pull Request und jedem Push auf `main`:

1. `actions/checkout@v7` holt das Repo, `actions/setup-node@v7` installiert Node 24 aus `engines` in `package.json`, mit
   npm-Cache.
2. `npm ci`: Abhängigkeiten genau nach `package-lock.json`.
3. `npm run check`: Linter, Format, Typen, Tests und Build, also dieselben Prüfungen wie lokal.

Ein Lauf ohne npm-Cache dauert etwa eine Minute, davon rund 40 Sekunden für `npm ci`. Mit Cache waren es 33 Sekunden, davon
6 für `npm ci`. Der Workflow darf nur lesen und bricht nach 10 Minuten ab. Ein neuer Push in einen PR ersetzt dessen älteren
Lauf, auf `main` läuft jeder Commit in einer eigenen `concurrency`-Gruppe bis zum Ende. Der Workflow braucht keine Secrets und
kein Cloudflare-Konto.

## Wie haben wir es eingerichtet?

**2026-11-03, Phase 0:** PR #3, Plan
[[projects/quiz-poker/docs/plaene/2026-11-03-ci-und-abschluss-phase-0|Plan: CI und Abschluss von Phase 0]].

- **Probelauf rot:** Mit der absichtlich falsch formatierten Datei `src/ci-probe.ts` schlug `prettier . --check` fehl. Damit
  ist belegt, dass die CI Fehler findet.
- **Lauf grün:** Ohne die Datei bestand der Job. `npm ci` läuft also mit der `package-lock.json` vom Mac auf Linux, Build und
  Tests laufen mit dem Eintrag `allowScripts`, und `wrangler types` läuft ohne Login bei Cloudflare. Ob `allowScripts` in der CI
  tatsächlich gegriffen hat, zeigt das Log nicht.

**2026-11-04, vor Phase 3:** PR #12. Läufe auf `main` verdrängen sich nicht mehr gegenseitig, siehe Abschnitt „Fehler“.

## Regeln

- **Vor jedem Merge `gh pr checks <nr>`: Die CI muss grün sein.** Das Repo ist privat und läuft mit GitHub Free. Dort
  verhindert GitHub einen Merge bei roter CI nicht.
- Private Repos haben bei GitHub Free ein Kontingent an Freiminuten pro Monat. Beim Einrichten waren das laut Notiz in
  tages-dashboard 2000 Minuten, bei etwa einer Minute pro Lauf reicht das weit.

## Befehle

```bash
gh pr checks <nr> --watch      # Checks eines PRs anzeigen und warten, bis sie fertig sind
gh run list                    # letzte Läufe aller Workflows
gh run view <id> --log-failed  # nur die Log-Zeilen der fehlgeschlagenen Schritte
```

## Fehler

**`[warn] src/ci-probe.ts` / `Code style issues found in the above file`, Exit-Code 1 im Schritt „Prüfungen“**
(2026-11-03, absichtlich):

- Ursache: Die Datei war nicht nach Prettier formatiert, `prettier . --check` in `npm run format:check` schlägt fehl.
- Lösung: lokal `npm run format`, dann committen. Hier wurde die Probedatei gelöscht.

**Lauf auf `main` endet als `cancelled`, der Merge-Commit bleibt ungeprüft** (in musik-app aufgetreten, hier vorbeugend
behoben am 2026-11-04):

- Ursache: Alle Läufe von `main` lagen in einer `concurrency`-Gruppe mit `cancel-in-progress: true`. Damit bricht schon der
  zweite Merge den laufenden Lauf des ersten ab. Ohne `cancel-in-progress` bliebe die Falle bei drei schnellen Merges: Eine
  Gruppe hat höchstens einen wartenden Lauf, und ein neuer wartender verdrängt den alten.
- Lösung: Auf `main` eine Gruppe je Commit (`github.sha`) und kein `cancel-in-progress`. Beide Teile sind nötig.
