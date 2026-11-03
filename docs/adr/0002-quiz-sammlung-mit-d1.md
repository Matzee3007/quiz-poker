---
titel: "ADR 0002: Quiz-Sammlung mit D1"
status: akzeptiert
erstellt: 2026-11-03
tags: [adr, architektur, speicher]
---

# ADR (Architecture Decision Record) 0002: Quiz-Sammlung mit D1

## Kontext

Quizze sollen in einem eigenen Bereich erstellt und für neue Partien ausgewählt werden. Ersteller entscheiden, ob ein
Quiz öffentlich oder privat ist. Durable Objects verwalten bisher nur laufende Spielräume. Jeder, der auf die Seite
kommt, kann ein Konto anlegen und Quizze erstellen (siehe [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]]),
und das Hosting soll kostenlos bleiben.

## Entscheidung

Die Quiz-Sammlung liegt in **Cloudflare D1**, einer SQL-Datenbank, die allen Spielräumen gemeinsam zur Verfügung steht.
Die Durable Objects bleiben für den Zustand laufender Partien zuständig.

Der kostenlose Tarif reicht für diesen Umfang: 5 Millionen gelesene und 100.000 geschriebene Zeilen pro Tag, 5 GB
Speicher, Stand 2026-11-03. Über den Tageslimits schlagen Abfragen bis 00:00 UTC fehl, statt Kosten zu erzeugen.

## Alternativen

- **Quiz als Datei herunter- und hochladen:** Braucht keine Datenbank, erlaubt aber keine Auswahl in der Seite und keine
  öffentlichen Quizze.
- **Ein eigenes Durable Object für die Sammlung:** Käme ohne neuen Dienst aus, vermischt aber zwei Aufgaben unter einem
  Baustein. Jeder Zugriff liefe über ein einzelnes Objekt, und die Daten wären schwerer einzusehen.
- **Workers KV (einfacher Schlüssel-Wert-Speicher):** Für einzelne Quizze passend, Listen und Filter nach öffentlich und
  privat wären aber umständlicher als in SQL.

## Konsequenzen

- Mit D1 kommt ein zweiter Speicher mit Tabellen und Migrationen dazu, die im Repo gepflegt werden müssen.
- Weil sich jeder ein Konto anlegen und dann erstellen darf, müssen Eingaben auf dem Server geprüft und in der Größe begrenzt werden. Betreiber bleibt der
  Entwickler, auch für Inhalte, die Fremde dort ablegen.
- Der Export als Datei ist nicht vorgesehen und könnte später ergänzt werden.
