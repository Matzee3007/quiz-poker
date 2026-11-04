---
titel: Lernjournal Phase 2 - Veröffentlichung
status: abgeschlossen
phase: 2
erstellt: 2026-11-04
tags: [lernjournal, phase-2, cloudflare, wrangler, websockets]
---

# Lernjournal Phase 2: Veröffentlichung

Fortsetzung von [[projects/quiz-poker/docs/journal/Lernjournal Phase 2 - Spielraum online|Lernjournal Phase 2 - Spielraum online]]. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

## Erledigt

- [x] Cloudflare-Konto angelegt, `wrangler` angemeldet
- [x] Spiel veröffentlicht: `https://quiz-poker.quiz-poker.workers.dev`
- [x] `/api/health` und Startseite unter der echten Adresse geprüft
- [x] Ganze Partie per Skript über echte WebSockets: 9 Runden, Quiz-Master und zwei Spieler
- [x] Partie im Browser vom Entwickler gespielt, Ergebnis: „hat geklappt“
- [x] Phase 2 abgeschlossen

## Befehle: Veröffentlichen

```bash
npx wrangler whoami
npx wrangler login
npm run deploy
/usr/bin/curl -sS 'https://quiz-poker.quiz-poker.workers.dev/api/health'
```

- `npx wrangler whoami`: zeigt, ob `wrangler` angemeldet ist.
- `npx wrangler login`: verbindet `wrangler` im Browser mit dem Konto, einmalig je Rechner.
- `npm run deploy`: baut das Spiel und lädt Worker und statische Dateien hoch.
- `/usr/bin/curl ...`: prüft, ob der Server unter der echten Adresse antwortet.

## Neu gelernt

### Zwei Teile der Adresse

In `quiz-poker.quiz-poker.workers.dev` ist der erste Teil der Name des Workers aus `wrangler.jsonc`, der zweite die Subdomain des Kontos. Hat das Konto noch keine, legt das erste `npm run deploy` sie an.

### Hochgeladen heißt noch nicht erreichbar

`wrangler` meldete Erfolg, die Adresse antwortete aber erst rund 3 Minuten später. Ein Abruf in einer Schleife ist dann besser als ein einzelner Versuch.

### Ein Skript prüft den Server, nicht die Oberfläche

Das Testskript sprach direkt mit dem Server und deckte so Spielablauf, Geheimhaltung, Rechte und Rückkehr ab. Darstellung und Neuverbinden im Browser sieht es nicht, dafür braucht es die Partie im Browser. Das Skript lag außerhalb des Repos.

### Schließ-Signal online

Lokal kam das Schließ-Signal erst nach rund 10 Sekunden an, online im Skript nach 94 ms. Die Nachricht `beendet` kam nach 40 ms. Der Browser war dabei nicht die Gegenstelle, gemessen wurde mit Node.js.

## Fehler und Lösungen

### `curl: (35) LibreSSL/3.3.6: error:1404B410:SSL routines:ST_CONNECT:sslv3 alert handshake failure`

- **Wo:** erster Abruf von `/api/health` direkt nach `npm run deploy`.
- **Ursache:** nicht endgültig geklärt. Die Subdomain war gerade erst angelegt, `wrangler` kündigt dafür einige Minuten Wartezeit an.
- **Lösung:** warten, beim 7. Versuch im Abstand von 30 Sekunden kam die Antwort.
- **Prüfen:** Der Befehl oben liefert `{"status":"ok"}`.

### `Zeitüberschreitung bei Quiz-Master: alle gesetzt`

- **Wo:** erster Lauf des Testskripts, Runde 6.
- **Ursache:** Fehler im Skript. Es setzte fest 20 Chips, Ben hatte nur noch 10, und der Server lehnte den Einsatz zu Recht ab.
- **Lösung:** Einsatz nach dem Chipstand berechnen.
- **Prüfen:** Der zweite Lauf ging durch alle 9 Runden.

## Aus dem Chat

-

## Offene Fragen

- Ob ein Raum im Leerlauf online wirklich einschläft, wurde nicht direkt beobachtet. Belegt ist nur, dass Verbindungen und Spielstand 60 Sekunden Leerlauf überstanden.

## Nächste Schritte

1. Phase 3 – Quiz-Sammlung, vorher fragen, ob etwas anderes ansteht (siehe [[projects/quiz-poker/docs/Nächste Session|Nächste Session]]).
