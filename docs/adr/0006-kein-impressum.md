---
titel: "ADR 0006: Kein Impressum, kurze Datenschutzhinweise"
status: akzeptiert
erstellt: 2026-11-05
tags: [adr, recht, konten]
---

# ADR (Architecture Decision Record) 0006: Kein Impressum, kurze Datenschutzhinweise

Ersetzt in der [[projects/quiz-poker/docs/Projektvision|Projektvision]] die Vorgabe, vor der Veröffentlichung der Konten ein
Impressum und Datenschutzhinweise online zu stellen.

## Kontext

Die Seite ist frei erreichbar, aber nicht beworben, und Konten gibt es nur mit Einladung. Sie speichert die E-Mail-Adressen der
Eingeladenen. Ob sie damit ein Impressum braucht, ließ sich nicht klären, deshalb sollte es vorsorglich kommen. Ein Impressum
würde Name und Anschrift des Entwicklers öffentlich machen.

## Entscheidung

- **Kein Impressum.** Name und Anschrift des Entwicklers stehen nirgends auf der Seite.
- **Kurze Datenschutzhinweise ohne Name und Anschrift:** Eine Seite sagt den Eingeladenen, was gespeichert wird, wer hostet und wie
  sie ihre Daten löschen.

Die Entscheidung ist nicht rechtlich geprüft, und das Risiko trägt der Entwickler.

## Alternativen

- **Impressum und vollständige Datenschutzerklärung:** Der vorsichtigste Weg, macht aber Name und Anschrift öffentlich.
- **Gar keine Hinweise:** Am einfachsten, aber die Eingeladenen erfahren auf der Seite nicht, was mit ihren Daten geschieht.

## Konsequenzen

- Die Datenschutzhinweise sind kein vollständiger Datenschutztext.
- Wird die Seite beworben, geschäftlich genutzt oder für Fremde geöffnet, muss diese Entscheidung neu geprüft werden.

## Nachtrag 2026-11-06: Repo im GitHub-Profil

Das Repo wird öffentlich und steht mit dem Live-Link im GitHub-Profil, das der Entwickler in seinem Lebenslauf nennt.
Neu geprüft: Der Entwickler bleibt bei **kein Impressum**. Profil und README nennen weder Klarnamen noch Anschrift, die Seite
wird damit nicht beworben. Auch diese Einschätzung ist nicht rechtlich geprüft.
