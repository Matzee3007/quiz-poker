---
titel: "ADR 0003: Konten nur für Quiz-Master"
status: akzeptiert
erstellt: 2026-11-03
tags: [adr, architektur, konten]
---

# ADR (Architecture Decision Record) 0003: Konten nur für Quiz-Master

Teilweise ersetzt durch [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]: Registrierung nur
mit Einladung, kein E-Mail-Versand, Spielraum auch ohne Konto.

## Kontext

Private Quizze sollen nur für ihren Ersteller sichtbar sein, und zwar auf all seinen Geräten. Das lässt sich ohne Konten
nicht zuverlässig lösen. Gleichzeitig soll der Einstieg am Spieleabend einfach bleiben.

## Entscheidung

- **Nur Quiz-Master und Ersteller haben ein Konto.** Spieler treten als Gäste mit Raumcode und Namen bei und finden über
  ein Token im Browser zurück.
- **Login mit E-Mail und Passwort,** damit sich Passwörter zurücksetzen lassen. Die Adresse wird bei der Registrierung per
  Link bestätigt. Weitere persönliche Daten werden nicht gespeichert.
- **Die Passwort-Sicherheit kommt aus einer fertigen Bibliothek.** Kandidat ist Better Auth. Dass sie mit D1 zusammenarbeitet,
  wird vor Phase 3 geprüft.

## Alternativen

- **Keine Konten, geheimer Link je Quiz:** Kommt ohne Login aus, aber private Quizze erscheinen nicht auf allen Geräten,
  und ein verlorener Link bedeutet ein verlorenes Quiz.
- **Konten auch für Spieler:** Sichert jedem einen festen Platz und verhindert erneutes Beitreten für neue Startchips, aber
  jeder Freund müsste sich vorher registrieren. Konten müssten außerdem schon in Phase 2 fertig sein.
- **Benutzername ohne E-Mail:** Speichert weniger Daten, aber ein vergessenes Passwort müsste der Entwickler von Hand
  zurücksetzen.
- **Login mit Google:** Kein eigenes Passwort, aber jeder bräuchte ein Google-Konto.
- **Passwort-Sicherheit selbst bauen:** Lehrreich, aber bei einem frei erreichbaren Dienst zu riskant.

## Konsequenzen

- Für das Bestätigen der Adresse und das Zurücksetzen von Passwörtern braucht das Projekt einen Dienst zum E-Mail-Versand. Die Auswahl fällt im Plan für
  Phase 3.
- E-Mail-Adressen sind personenbezogene Daten: Datenschutz und mögliche Betreiberpflichten vor der Veröffentlichung von
  Phase 3 klären.
- Phase 2 läuft noch ohne Konten. Die Rolle Quiz-Master hängt dort an einem Token und wird in Phase 3 an das Konto gebunden.
- Spieler können über einen neuen Beitritt erneut Startchips bekommen. Dafür kann der Quiz-Master Spieler entfernen.
