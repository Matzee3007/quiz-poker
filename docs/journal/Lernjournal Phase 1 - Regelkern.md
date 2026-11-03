---
titel: Lernjournal Phase 1 - Regelkern
status: abgeschlossen
phase: 1
erstellt: 2026-11-03
tags: [lernjournal, phase-1, typescript, vitest, tdd]
---

# Lernjournal Phase 1: Regelkern

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 0 - Projektvision und CI|Lernjournal Phase 0 - Projektvision und CI]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Plan geschrieben: [[projects/quiz-poker/docs/plaene/2026-11-03-regelkern|Plan: Regelkern]]
- [x] `src/regeln/` testgetrieben gebaut: Chips, Partie erstellen und starten, Einsatz, Antworten, Auswertung, Auflösung, nächste Runde,
  Sieger, später einsteigen, Spieler entfernen (PR #5)
- [x] `/code-review` und `plan-pruefer` ausgewertet, die Funde mit dem Entwickler entschieden und eingearbeitet
- [x] 55 Tests grün, CI grün
- [x] Phase 1 abgeschlossen

## Entscheidungen aus dem Review

- Beitritt in der letzten Runde wird abgelehnt (`letzte-runde`), sonst könnte jemand mit 100 Chips gewinnen, ohne zu spielen.
- Namen im Code folgen dem Glossar: `auswertungen`, `antwortAuswerten`, `nicht-ausgewertet`, `rundenSpieler`.
- `sieger` gilt nur nach dem Ende der Partie, eine doppelte ID hat den eigenen Code `id-vergeben`.
- Hingenommen: Ein entfernter Spieler kann neu beitreten und hat wieder 100 Chips.
- Auf Phase 2 verschoben: Musterlösung über die Ansicht je Rolle schützen, Spieler-IDs auf dem Server erzeugen.

## Befehle: Rot-Grün-Schleife

```bash
npm test -- src/regeln/partie.test.ts
npm run check
```

- `npm test -- <datei>`: führt nur die Tests einer Datei aus, um schnell zu sehen, ob sie rot oder grün sind.
- `npm run check`: alle Prüfungen vor jedem Commit.

## Neu gelernt

### Reine Funktionen als Regelkern

Jede Spielaktion nimmt einen Spielstand und gibt einen neuen zurück oder wirft einen `Regelfehler`. Dadurch lässt sich eine ganze Partie ohne
Server und Browser durchspielen, und das Durable Object kann die Funktionen in Phase 2 direkt aufrufen.

### Grüne Tests sichern nicht alles ab

Der `plan-pruefer` baute 54 Fehler in eine Kopie des Codes ein, 13 blieben unerkannt. So fielen Lücken auf wie der fehlende Test, dass
Nachschub nur bei genau 0 Chips kommt. Danach wurden Tests ergänzt, der Probelauf mit den eingebauten Fehlern wurde aber nicht wiederholt.

### Eingefrorene Spielstände

`Object.freeze` sperrt ein Objekt gegen Änderungen. Spielt man damit eine Partie durch, schlägt jede Funktion fehl, die ihre Eingabe doch verändert.

### Ein Plan kann sich selbst widersprechen

Der Plan schrieb Namen vor, die das Glossar verbietet. Der Code folgte dem Plan wörtlich, das fiel erst bei der Prüfung auf.

## Fehler und Lösungen

-

## Aus dem Chat

-

## Offene Fragen

- Die Ansicht je Rolle ist noch nicht gebaut, bis dahin darf nichts aus `aktuelleRunde` ungefiltert an Spieler gehen.

## Nächste Schritte

1. Fragen, ob vor Phase 2 etwas anderes ansteht.
2. `@cloudflare/vitest-plugin` prüfen, Cloudflare-Konto anlegen.
3. Phase 2 (Spielraum online) mit `plan-schreiben` planen.
