# CLAUDE.md – Quiz-Poker

Diese Datei lädt Claude Code bei jedem Start in diesem Projekt automatisch. Sie enthält den
dauerhaften Projektkontext. Die ausführliche Vision steht in `docs/Projektvision.md`.
Projektunabhängige Regeln (Arbeitsweise, Git, Phasenwechsel, Doku-Konventionen, Antwortstil)
stehen in der globalen `~/.claude/CLAUDE.md` (Repo `claude-ecosystem`, `config/CLAUDE.md`).

## Projektziel

Quiz-Poker ist ein Online-Quiz im Browser für Spieleabende in der Freundesrunde. Ein Quiz-Master erstellt Kategorien,
Runden, Fragen und Antworten, die Spieler setzen Pokerchips auf ihre Antworten, am Ende gewinnt, wer die meisten Chips hat.
Frei erreichbar, aber keine beworbene Plattform. Konten nur für eingeladene Quiz-Master, die Quizze speichern wollen (ADR 0003, ADR 0005), Spieler sind Gäste, kein Echtgeld. Kein Impressum, kurze Datenschutzhinweise (ADR 0006).

Gleichwertiges Ziel ist das **Lernen**: Echtzeit-Multiplayer mit WebSockets, Rollen und Rechte (Spieler sehen Lösungen erst nach der Auflösung), testgetriebene Spiellogik und ein neuer Stack aus Svelte und Cloudflare.

## Stack

- **Sprache:** TypeScript
- **Oberfläche:** Svelte 5 mit Vite 8 (eine einzelne Seite, kein SvelteKit)
- **Server und Echtzeit:** Cloudflare Workers und Durable Objects, WebSockets (Durable Objects ab Phase 2)
- **Hosting:** Cloudflare (kostenloser Tarif), Werkzeug `wrangler`
- **Tests:** Vitest 4 (bewusst nicht 5, siehe ADR 0001), Playwright für den Browser-Durchlauf (ADR 0007)
- **Qualität:** ESLint, Prettier, `svelte-check`

Begründung und Alternativen: `docs/adr/0001-stack.md`.

## Architekturprinzipien

1. **Der Server ist die Wahrheit:** Spielstand, Einsätze und Lösungen liegen auf dem Server. Der Browser bekommt nur,
   was seine Rolle gerade sehen darf. Lösungen und fremde Einsätze gehen erst bei der Auflösung einer Runde hinaus.
2. **Regeln ohne Technik:** Die Spielregeln sind reines TypeScript ohne Svelte und Cloudflare und werden testgetrieben
   entwickelt.
3. **Ein Raum, ein Durable Object:** Jeder Spielraum hat genau ein Objekt, das seinen Zustand verwaltet. Es speichert nach jeder Aktion
   und schläft im Leerlauf (ADR 0004).
4. **Klein bleiben:** Für eine Freundesrunde, ohne Konten für Spieler und ohne Echtgeld. Quizze liegen ab Phase 3 in D1
   (ADR 0002).
5. **Kontext liegt in Dateien** (`CLAUDE.md`, `docs/`), nicht im Chatverlauf.

## Repo-Struktur

```
quiz-poker/
├── src/                Oberfläche (Svelte)
│   ├── App.svelte      Wählt je nach Adresse, Token und Ansicht, was zu sehen ist
│   ├── ansichten/      Eine Komponente je Ansicht (Start, Editor, Meine Quizze, Warten, Runde, Auflösung, Ende)
│   ├── entwurfSpeicher.ts  Entwurf des Einmal-Quiz im localStorage
│   ├── konto.ts        Anfragen für Anmelden, Registrieren, Passwort und Konto
│   ├── main.ts         Einstieg im Browser
│   ├── meldungen.ts    Fehlercodes als deutsche Meldungen
│   ├── stil.css        Stil C aus dem Mock
│   ├── verbindung.svelte.ts  WebSocket mit Neuverbinden, Token im localStorage
│   ├── protokoll.ts    Nachrichten zwischen Gerät und Server
│   ├── quizSammlung.ts Anfragen für gespeicherte Quizze
│   ├── raumEroeffnen.ts  Anfrage zum Eröffnen eines Spielraums
│   └── regeln/         Spielregeln als reines TypeScript, ohne Svelte und Cloudflare
│       ├── ansicht.ts  Was jede Rolle sehen darf
│       ├── beispielQuiz.ts  Fest eingebautes Quiz, spielbar ohne Konto
│       ├── chips.ts    Startchips, Einsatzgrenzen, Gewinn und Verlust
│       ├── fehler.ts   Regelfehler mit Code
│       ├── partie.ts   Spielstand und alle Spielaktionen einer Partie
│       ├── quizEntwurf.ts  Unfertiger Entwurf im Editor: leer anlegen, lesen, sortieren
│       ├── quizpruefung.ts  Prüft ein Quiz zum Spielen und einen Entwurf zum Speichern
│       ├── raumcode.ts Raumcode erzeugen und prüfen
│       └── raumgrenze.ts  Höchstens 30 neue Spielräume pro Stunde
├── worker/             Server (Cloudflare Worker)
│   ├── index.ts        beantwortet Anfragen an /api/*, täglicher Lauf
│   ├── spielraum.ts    Durable Object je Spielraum: Verbindungen und Speicher
│   ├── raumzaehler.ts  Durable Object: Grenze für neue Spielräume
│   ├── passwortrechner.ts  Durable Object: Passwort-Hashing
│   ├── auth.ts         Einrichtung von Better Auth
│   ├── konto.ts        Registrieren mit Einladungscode, Passwort über Link
│   ├── quizze.ts       Gespeicherte Quizze: anlegen, auflisten, lesen, ändern, löschen
│   ├── anfrage.ts      Anfragen von der eigenen Seite lesen: Herkunft, Größe, JSON
│   ├── betrieb.ts      SQL für die Befehle des Betreibers
│   ├── geheimnis.ts    Codes und Links erzeugen und hashen
│   ├── aufraeumen.ts   Löscht täglich alte IP-Adressen und abgelaufene Links
│   ├── testhilfen.ts   Hilfen für Tests mit WebSockets
│   └── *.test.ts       Tests des Workers
├── migrations/         Tabellen in D1 als SQL-Dateien
├── scripts/            Befehle für den Betreiber, siehe docs/Betrieb.md
├── browser/            Browser-Durchlauf mit Playwright
├── docs/               Doku, zugleich Teil des Obsidian-Vaults
├── index.html          Seite, in die Svelte die Oberfläche einhängt
├── wrangler.jsonc      Cloudflare-Einstellungen
├── playwright.config.ts  Browser-Durchlauf
├── vite.config.ts      Bauen und lokaler Server
└── vitest.config.ts    Tests
```


## Befehle

```bash
npm ci                 # Abhängigkeiten genau nach package-lock.json installieren
npm run dev            # Lokal starten (Oberfläche und Worker), Adresse steht in der Ausgabe
npm run lint           # ESLint: Fehlerquellen im Code finden
npm run format         # Prettier: Code einheitlich formatieren
npm run typecheck      # Typen prüfen (wrangler types, svelte-check, tsc)
npm test               # Vitest einmal ausführen
npm run test:watch     # Vitest bei jeder Änderung neu ausführen
npm run test:browser   # Browser-Durchlauf mit Playwright, von Hand, siehe docs/tools/Playwright.md
npm run build          # Oberfläche und Worker für den Betrieb bauen
npm run check          # Alle Prüfungen auf einmal: Linter, Format, Typen, Tests, Build
npm run deploy         # Zu Cloudflare hochladen (braucht Konto und wrangler login)
npm run einladung      # Einladungslink erzeugen, siehe docs/Betrieb.md
npm run passwort-link -- <email>   # Link zum Zurücksetzen erzeugen, siehe docs/Betrieb.md
npm run quiz-loeschen -- <id>      # Ein gespeichertes Quiz löschen, siehe docs/Betrieb.md
```

Vor jedem Commit: `npm run check` (Linter, Format, Typen, Tests und Build)

## Dokumentation

Allgemeine Konventionen (ADRs, Lernjournale, Tool-Notizen, Skills, Tools für später) stehen in
der globalen `CLAUDE.md`. Roadmap und Phasen stehen in `docs/Projektvision.md`.
