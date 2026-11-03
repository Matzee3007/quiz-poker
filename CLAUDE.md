# CLAUDE.md – Quiz-Poker

Diese Datei lädt Claude Code bei jedem Start in diesem Projekt automatisch. Sie enthält den
dauerhaften Projektkontext. Die ausführliche Vision steht in `docs/Projektvision.md`.
Projektunabhängige Regeln (Arbeitsweise, Git, Phasenwechsel, Doku-Konventionen, Antwortstil)
stehen in der globalen `~/.claude/CLAUDE.md` (Repo `claude-ecosystem`, `config/CLAUDE.md`).

## Projektziel

Quiz-Poker ist ein Online-Quiz im Browser für Spieleabende in der Freundesrunde. Ein Quiz-Master erstellt Kategorien,
Runden, Fragen und Antworten, die Spieler setzen Pokerchips auf ihre Antworten, am Ende gewinnt, wer die meisten Chips hat.
Frei erreichbar, aber keine beworbene Plattform. Konten nur für Quiz-Master (ADR 0003), Spieler sind Gäste, kein Echtgeld.

Gleichwertiges Ziel ist das **Lernen**: Echtzeit-Multiplayer mit WebSockets, Rollen und Rechte (Spieler sehen Lösungen erst nach der Auflösung), testgetriebene Spiellogik und ein neuer Stack aus Svelte und Cloudflare.

## Stack

- **Sprache:** TypeScript
- **Oberfläche:** Svelte 5 mit Vite 8 (eine einzelne Seite, kein SvelteKit)
- **Server und Echtzeit:** Cloudflare Workers und Durable Objects, WebSockets (Durable Objects ab Phase 2)
- **Hosting:** Cloudflare (kostenloser Tarif), Werkzeug `wrangler`
- **Tests:** Vitest 4 (bewusst nicht 5, siehe ADR 0001)
- **Qualität:** ESLint, Prettier, `svelte-check`

Begründung und Alternativen: `docs/adr/0001-stack.md`.

## Architekturprinzipien

1. **Der Server ist die Wahrheit:** Spielstand, Einsätze und Lösungen liegen auf dem Server. Der Browser bekommt nur,
   was seine Rolle gerade sehen darf. Lösungen und fremde Einsätze gehen erst bei der Auflösung einer Runde hinaus.
2. **Regeln ohne Technik:** Die Spielregeln sind reines TypeScript ohne Svelte und Cloudflare und werden testgetrieben
   entwickelt.
3. **Ein Raum, ein Durable Object:** Jeder Spielraum hat genau ein Objekt, das seinen Zustand verwaltet.
4. **Klein bleiben:** Für eine Freundesrunde, ohne Konten für Spieler und ohne Echtgeld. Quizze liegen ab Phase 3 in D1
   (ADR 0002).
5. **Kontext liegt in Dateien** (`CLAUDE.md`, `docs/`), nicht im Chatverlauf.

## Repo-Struktur

```
quiz-poker/
├── src/                Oberfläche (Svelte)
│   ├── App.svelte      Startseite
│   └── main.ts         Einstieg im Browser
├── worker/             Server (Cloudflare Worker)
│   ├── index.ts        beantwortet Anfragen an /api/*
│   └── index.test.ts   Tests des Workers
├── docs/               Doku, zugleich Teil des Obsidian-Vaults
├── index.html          Seite, in die Svelte die Oberfläche einhängt
├── wrangler.jsonc      Cloudflare-Einstellungen
├── vite.config.ts      Bauen und lokaler Server
└── vitest.config.ts    Tests
```

Ziel ab Phase 1: `src/regeln/` als reines TypeScript für die Spielregeln, ohne Svelte und ohne Cloudflare.
Ziel ab Phase 2: ein Durable Object unter `worker/` je Spielraum.

## Befehle

```bash
npm ci                 # Abhängigkeiten genau nach package-lock.json installieren
npm run dev            # Lokal starten (Oberfläche und Worker), Adresse steht in der Ausgabe
npm run lint           # ESLint: Fehlerquellen im Code finden
npm run format         # Prettier: Code einheitlich formatieren
npm run typecheck      # Typen prüfen (wrangler types, svelte-check, tsc)
npm test               # Vitest einmal ausführen
npm run test:watch     # Vitest bei jeder Änderung neu ausführen
npm run build          # Oberfläche und Worker für den Betrieb bauen
npm run check          # Alle Prüfungen auf einmal: Linter, Format, Typen, Tests, Build
npm run deploy         # Zu Cloudflare hochladen (braucht Konto und wrangler login)
```

Vor jedem Commit: `npm run check` (Linter, Format, Typen, Tests und Build)

## Dokumentation

Allgemeine Konventionen (ADRs, Lernjournale, Tool-Notizen, Skills, Tools für später) stehen in
der globalen `CLAUDE.md`. Roadmap und Phasen stehen in `docs/Projektvision.md`.
