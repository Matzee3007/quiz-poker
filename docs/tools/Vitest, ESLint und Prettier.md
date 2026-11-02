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

- **Vitest 4 statt 5:** `@cloudflare/vitest-plugin` verlangt laut Doku Vitest 4.1, siehe [[projects/quiz-poker/docs/adr/0001-stack|ADR 0001]].
- `vitest.config.ts` ist getrennt von `vite.config.ts`, damit Tests bisher ohne Cloudflare-Laufzeit laufen.
- ESLint mit `typescript-eslint` und `eslint-plugin-svelte`, Prettier mit `prettier-plugin-svelte`.

## Befehle

```bash
npm test        # Tests einmal ausführen
npm run check   # Linter, Format, Typen, Tests und Build
```

## Fehler

-
