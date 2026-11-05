---
titel: Betrieb
status: aktiv
erstellt: 2026-11-05
tags: [betrieb, konten]
---

# Betrieb

Befehle für den Betreiber, eine Admin-Seite gibt es nicht ([[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]). Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].

Alle Befehle wirken auf die echte Datenbank, mit `-- --lokal` auf die lokale. Sie brauchen `npx wrangler login`.

## Jemanden einladen

```bash
npm run einladung        # gibt einen Link /registrieren?code=… aus, gültig bis zur Nutzung
```

Den Link selbst weiterschicken. Die Datenbank kennt nur seinen Hash, er lässt sich später nicht mehr anzeigen.

## Vergessenes Passwort

```bash
npm run passwort-link -- freund@beispiel.de    # gibt einen Link /passwort-neu?token=… aus, 24 Stunden und einmal gültig
```

Einen Tippfehler in der Adresse meldet der Befehl nicht. Der Link wird dann beim Benutzen abgelehnt.

## Datenbank ändern

```bash
npx wrangler d1 migrations apply quiz-poker --remote    # neue Dateien aus migrations/ ausführen, immer vor npm run deploy
```

Zuerst die Migration, dann hochladen. Sonst läuft neuer Code gegen alte Tabellen.

## Geheimnis setzen oder wechseln

```bash
npx wrangler secret put BETTER_AUTH_SECRET    # fragt den Wert ab, erzeugen mit: openssl rand -hex 32
```

Das Geheimnis schützt die Sitzungen und die im Browser gespeicherten Cookies. Ist es bekannt geworden, sofort wechseln. Danach müssen sich alle neu anmelden, Konten und Passwörter bleiben erhalten.
