---
titel: "ADR 0004: Spielstand im Speicher des Durable Objects mit Hibernation"
status: akzeptiert
erstellt: 2026-11-03
tags: [adr, architektur, echtzeit, durable-objects]
---

# ADR (Architecture Decision Record) 0004: Spielstand im Speicher des Durable Objects mit Hibernation

## Kontext

Jeder Spielraum ist ein Durable Object mit WebSocket-Verbindungen zu allen Geräten. Ein Spieleabend hat lange Pausen, in denen
nichts passiert, die Partie darf aber weder dann noch bei einer neuen Veröffentlichung verloren gehen. Das Hosting soll im
kostenlosen Tarif bleiben (13.000 GB-s Rechenzeit pro Tag, Stand 2026-11-03).

## Entscheidung

- Das Durable Object nutzt die **WebSocket Hibernation API**: Es schläft im Leerlauf, während die Verbindungen offen bleiben, und
  wacht bei einer Nachricht wieder auf.
- Die Partie wird **nach jeder Aktion im SQLite-Speicher des Objekts** gesichert. Jede Aktion geht vom gespeicherten Stand aus.
- Das Gerät schickt nur Aktionen, der Server antwortet allen mit ihrer **kompletten Ansicht**. Kleine Änderungsmeldungen gibt es nicht.

## Alternativen

- **Objekt bleibt wach und hält den Stand im Arbeitsspeicher:** Einfacher zu schreiben, aber eine neue Veröffentlichung verliert die
  Partie, und jede offene Verbindung kostet durchgehend Rechenzeit.
- **Kleine Änderungsmeldungen statt ganzer Ansicht:** Spart wenige Bytes, aber der Stand kann auseinanderlaufen, und die Rückkehr nach
  einem Abbruch bräuchte einen eigenen Weg.

## Konsequenzen

- Variablen im Objekt überleben das Schlafen nicht. Daten je Verbindung gehören in `serializeAttachment` (höchstens 16.384 Bytes), und
  alles andere wird aus dem Speicher gelesen.
- Jede Aktion schreibt in den Speicher. Das Limit von 100.000 geschriebenen Zeilen pro Tag ist für eine Freundesrunde kein Thema.
- Tests müssen das Aufwachen abdecken, nicht nur den Lauf im Arbeitsspeicher.
