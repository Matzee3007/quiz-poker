---
titel: "Plan: CI und Abschluss von Phase 0"
status: aktiv
erstellt: 2026-11-03
tags: [plan, ci, phase-0]
---

# Plan: CI und Abschluss von Phase 0

**Ziel:** Jeder Pull Request wird auf GitHub mit denselben Prüfungen wie lokal getestet, danach ist Phase 0 abgeschlossen.

**Vorgehen:** Der Workflow übernimmt das erprobte Muster aus tages-dashboard (`.github/workflows/ci.yml`). Eine absichtlich
falsch formatierte Probedatei belegt, dass die CI (Continuous Integration, automatische Prüfung bei jedem Push) Fehler
findet. Danach wird die Phase mit Journal und Übergabe abgeschlossen.

**Technik:** GitHub Actions, npm, vorhandenes Skript `npm run check`.

**Anforderung:** [[projects/quiz-poker/docs/Projektvision|Projektvision]], Phase 0. Der erste Test und die Prüfbefehle stehen
schon (Lernjournal Phase 0), die Vision ist geschärft. Die Phasen 1 bis 4 sind in der Roadmap geschnitten, ihre Detailpläne
entstehen jeweils am Start der Phase.

## Feste Vorgaben

- Node-Version 24 über `engines` in `package.json`, wie in `docs/Arbeitsumgebung.md`.
- Die CI ruft nur `npm ci` und `npm run check` auf. `check` enthält den Build bereits, kein eigener Build-Schritt.
- Der Workflow darf nur lesen (`permissions: contents: read`), bricht nach 10 Minuten ab und ersetzt ältere Läufe desselben
  Branches.
- Kein Cloudflare-Konto und keine Secrets, die Veröffentlichung kommt erst in Phase 2.
- Vor jedem Merge `gh pr checks <nr>`: Bei GitHub Free im privaten Repo verhindert GitHub einen Merge bei roter CI nicht.

## Prüf-Schwerpunkte

Alle fünf sind Eigenschaften des Laufs auf GitHub und werden in Aufgabe 1, Schritt 4 und 5 am echten Lauf belegt.

1. `package-lock.json` vom Mac auf Linux: `npm ci` installiert auch die Linux-Pakete von `workerd` und `esbuild`.
2. `allowScripts` lehnt die Installationsskripte von `esbuild` und `workerd` ab: Build und Tests laufen trotzdem.
3. `npm run typecheck` ruft `wrangler types` auf: Das muss ohne Login bei Cloudflare gelingen.
4. `worker-configuration.d.ts` ist nicht im Repo: Die Typprüfung findet die Datei nach `wrangler types` trotzdem.
5. Ein Formatfehler macht die CI rot, sie meldet also nicht einfach immer Erfolg.

### Aufgabe 1: CI mit GitHub Actions

**Dateien:**

- Neu: `.github/workflows/ci.yml`
- Ändern: `package.json` (`engines`)
- Neu: `docs/tools/GitHub Actions - Einrichtung.md`
- Ändern: `docs/tools/Tools Übersicht.md` (Zeile unter „Im Einsatz“)
- Vorübergehend: `src/ci-probe.ts` (wird in Schritt 5 gelöscht)

**Schnittstellen:**

- Nutzt: `npm run check` aus `package.json`
- Liefert: Status `check` an jedem Pull Request, abrufbar mit `gh pr checks <nr>`

- [x] **Schritt 1: `engines` ergänzen**

`package.json` bekommt `"engines": { "node": "24" }`.

- [x] **Schritt 2: Workflow anlegen**

`.github/workflows/ci.yml` nach dem Muster von tages-dashboard: Name `CI`, Auslöser `pull_request` und `push` auf `main`,
`concurrency` mit `cancel-in-progress`, `permissions: contents: read`, Job `check` auf `ubuntu-latest` mit
`timeout-minutes: 10`. Schritte: `actions/checkout@v7`, `actions/setup-node@v7` mit `node-version-file: package.json` und
`cache: npm`, `npm ci`, `npm run check`.

- [x] **Schritt 3: Probedatei anlegen und lokal rot sehen**

`src/ci-probe.ts` mit dem Inhalt `export const probe   =   1`.

`npm run format:check`
Erwartet: `[warn] src/ci-probe.ts` und Exit-Code 1.

- [x] **Schritt 4: Branch pushen, PR öffnen, CI muss rot werden**

```bash
git add .github/workflows/ci.yml package.json src/ci-probe.ts
git commit -m "Add CI workflow with failing probe"
git push -u origin ci/github-actions
gh pr create --title "Add CI with GitHub Actions"
gh pr checks <nr> --watch
gh run view <id> --log-failed
```

Erwartet: Job `check` schlägt im Schritt `npm run check` bei `format:check` mit `src/ci-probe.ts` fehl. `npm ci` lief also
durch (Schwerpunkte 1, 2 und 5).

- [x] **Schritt 5: Probedatei löschen, CI muss grün werden**

```bash
git rm src/ci-probe.ts
git commit -m "Remove CI probe"
git push
gh pr checks <nr> --watch
```

Erwartet: `check` besteht. Damit laufen `wrangler types`, Typprüfung, Tests und Build auf Linux ohne Login (Schwerpunkte 2
bis 4).

- [x] **Schritt 6: Einrichtung dokumentieren und committen**

`docs/tools/GitHub Actions - Einrichtung.md` nach dem Muster von tages-dashboard: was die CI prüft, Probelauf mit Ergebnis,
Regel zu `gh pr checks`, Dauer des Laufs, Fehler mit Ursache und Lösung. Zeile in `docs/tools/Tools Übersicht.md` ergänzen.

```bash
npm run check
git add 'docs/tools/GitHub Actions - Einrichtung.md' 'docs/tools/Tools Übersicht.md'
git commit -m "Document CI setup"
git push
```

- [x] **Schritt 7: Prüfen und mergen**

`/code-review` für den PR und die Funde mit dem Entwickler durchgehen, der Agent `plan-pruefer` prüft den Branch gegen diesen
Plan. Danach `gh pr checks <nr>`, `gh pr view <nr> --json mergeable` und erst bei grün und `MERGEABLE` mergen.

### Aufgabe 2: Phase 0 abschließen

**Dateien:**

- Ändern: `docs/Projektvision.md` (Roadmap: Phase 0 abhaken)
- Ändern: `docs/journal/Lernjournal Phase 0 - Projektstart.md` (mit dem Skill `journal`, `status: abgeschlossen`)
- Ändern: `docs/Nächste Session.md` (mit dem Skill `naechste-session`)
- Ändern: `docs/plaene/2026-11-03-ci-und-abschluss-phase-0.md` (`status: abgeschlossen`, Haken)

**Schnittstellen:**

- Nutzt: den gemergten PR aus Aufgabe 1
- Liefert: `main` ohne offene PRs. Die Übergabe nennt Phase 1 als nächste Phase und die Frage, ob vorher etwas anderes
  ansteht.

- [ ] **Schritt 1: Journal mit dem Skill `journal` schreiben**

Enthält auch die Entscheidungen aus `/grill-with-docs` und die Korrektur der offenen Regelfrage (+5 statt +10).

- [ ] **Schritt 2: Roadmap abhaken und Übergabe mit dem Skill `naechste-session` schreiben**

- [ ] **Schritt 3: Doku-PR mergen und Stand prüfen**

`git status --short` und `gh pr list`
Erwartet: Branch `main`, keine Änderungen, keine offenen PRs.
