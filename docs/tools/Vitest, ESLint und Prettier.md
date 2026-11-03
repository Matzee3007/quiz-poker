---
titel: Vitest, ESLint und Prettier
status: aktiv
erstellt: 2026-11-02
tags: [tools, vitest, eslint, prettier]
---

# Vitest, ESLint und Prettier

**Vitest** führt Tests aus, **ESLint** sucht Fehlerquellen im Code, **Prettier** formatiert einheitlich. `svelte-check`
prüft zusätzlich die Typen in `.svelte`-Dateien.

## Wie wir es eingerichtet haben

- **Vitest 4 statt 5:** Beim Projektstart verlangte `@cloudflare/vitest-plugin` Vitest 4.1, Version 1.5 erlaubt auch `^5`. Ein Update ist eine eigene Aufgabe, siehe [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].
- `vitest.config.ts` ist getrennt von `vite.config.ts`: Die Tests laufen mit dem eigenen Plugin `cloudflareTest`, die Oberfläche nicht.
- ESLint mit `typescript-eslint` und `eslint-plugin-svelte`, Prettier mit `prettier-plugin-svelte`.

## Tests in der Cloudflare-Laufzeit

Seit Phase 2 laufen alle Tests mit `@cloudflare/vitest-plugin` in `workerd`, damit sich Durable Objects und WebSockets testen lassen.

- `exports.default.fetch(...)` aus `cloudflare:workers` ruft den Worker auf, `env.SPIELRAUM` erreicht das Durable Object.
- `evictDurableObject(stub)` aus `cloudflare:test` leert den Arbeitsspeicher wie beim Einschlafen, der Speicher und die WebSockets bleiben.
- `maxWorkers: 1` und `isolate: false` sind nötig: WebSockets mit Durable Objects gehen laut Cloudflare nicht mit einem eigenen Speicher je
  Testdatei. Deshalb nutzt jeder Test einen eigenen Raum.
- `@cloudflare/vitest-plugin/types` in `tsconfig.worker.json` liefert die Typen für `cloudflare:test`.

## Befehle

```bash
npm test        # Tests einmal ausführen
npm test -- src/regeln/partie.test.ts  # Nur die Tests einer Datei ausführen, für die Rot-Grün-Schleife
npm run check   # Linter, Format, Typen, Tests und Build
```

## Fehler

-
