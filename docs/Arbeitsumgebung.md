---
titel: Arbeitsumgebung
status: aktiv
erstellt: 2026-11-02
tags: [arbeitsumgebung, einrichtung]
---

# Arbeitsumgebung

Was dieses Projekt auf dem Rechner braucht, um zu laufen. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].
Die Einrichtung des Rechners für alle Projekte (Terminal, Statuszeile, `install.sh`) steht in [[Rechner]].

## Voraussetzungen

- Node.js 24 LTS mit npm 11 (Einrichtung siehe `STACKS.md` im Ecosystem, Abschnitt Next.js)
- Für die Veröffentlichung ab Phase 2: ein Cloudflare-Konto und `npx wrangler login`

## Umgebungsvariablen

Geheimnisse stehen in `.env` (nicht im Repo, Claude darf sie nicht lesen). Welche Variablen es gibt, steht
ohne Werte in `.env.example`, sobald die erste gebraucht wird.

## Starten und stoppen

```bash
npm ci        # Abhängigkeiten installieren, einmal nach dem Klonen
npm run dev   # Oberfläche und Worker lokal starten, Adresse steht in der Ausgabe, Stoppen mit Ctrl+C
```

`npm run dev` führt den Worker lokal in `workerd` aus, der Laufzeit von Cloudflare. Ein Konto ist dafür nicht nötig.
