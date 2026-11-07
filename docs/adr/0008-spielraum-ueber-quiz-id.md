---
titel: "ADR 0008: Spielraum aus gespeichertem Quiz über die Quiz-ID"
status: akzeptiert
erstellt: 2026-11-07
tags: [adr, quiz-sammlung, spielraum, sicherheit]
---

# ADR (Architecture Decision Record) 0008: Spielraum aus gespeichertem Quiz über die Quiz-ID

Ersetzt die Entscheidung „Spielen schickt den Inhalt“ aus dem
[[projects/quiz-poker/docs/plaene/2026-11-06-quizze-speichern|Plan von Schritt 3]].

## Kontext

In Schritt 3 von Phase 3 lud der Browser ein gespeichertes Quiz und schickte den ganzen Inhalt an `POST /api/raeume { quiz }`,
wie bei einem Einmal-Quiz. Der Server brauchte so keinen neuen Weg. Das `/code-review` von Schritt 3 merkte an (Fund 9),
dass der Server damit nicht prüft, ob der Inhalt wirklich zu einem gespeicherten Quiz gehört. Mit Schritt 4 kommen
öffentliche Quizze dazu. Wer sie ohne Konto spielt, darf ihren Inhalt nicht vorher über die Schnittstelle lesen. Der
Server muss den Inhalt also ohnehin selbst aus D1 holen.

## Entscheidung

- **Gespeicherte Quizze, eigene wie öffentliche, eröffnen den Spielraum mit `POST /api/raeume { quizId }`.** Der Server
  liest das Quiz aus D1, prüft es mit `quizPruefen` und gibt es dem Spielraum (`gespeichertesQuizLesen` in
  `worker/quizze.ts`).
- Ein öffentliches Quiz gilt für alle. Ein privates nur mit der Sitzung seines Erstellers, sonst 404 `quiz-unbekannt`, wie bei
  einer unbekannten ID. Die Sitzung wird nur bei privaten Quizzen abgefragt, das spart Rechenzeit (ADR 0005).
- Eine Anfrage mit `quizId` braucht den eigenen `Origin`, sonst 403. So kann keine fremde Seite mit dem Cookie eines
  Angemeldeten dessen private Quizze in einen Spielraum laden.
- Das Einmal-Quiz schickt weiter `{ quiz }`, ohne Inhalt gilt weiter das Beispiel-Quiz.

## Alternativen

- **Inhalt schicken wie bisher:** Kein neuer Weg, aber öffentliche Quizze bräuchten einen Weg, der ihren Inhalt vor dem
  Spielen an jeden ausliefert. Der Spielraum wüsste nicht, ob der Inhalt zum gespeicherten Quiz passt.
- **Gemischt:** Eigene Quizze schicken den Inhalt, öffentliche gehen über die ID. Zwei Wege für fast dasselbe, und der
  Unterschied müsste in der Oberfläche und in den Tests doppelt gepflegt werden.

## Konsequenzen

- Der Server ist die Wahrheit, auch beim Eröffnen: Gespielt wird der gespeicherte Stand, nicht der im Browser.
- Der Editor speichert vor dem Eröffnen und eröffnet dann über die ID. Ungespeicherte Änderungen kommen nicht in den Raum.
- Der Spielraum kopiert das Quiz beim Eröffnen. Spätere Änderungen, Privatstellen oder Löschen ändern eine laufende Partie
  nicht.
- Bei öffentlichen Quizzen sieht der Quiz-Master Fragen und Lösungen im Spielraum, wie bei jedem Quiz. Dass ein Mitspieler
  so vorab die Lösungen sehen kann, ist laut Projektvision bewusst hingenommen.
