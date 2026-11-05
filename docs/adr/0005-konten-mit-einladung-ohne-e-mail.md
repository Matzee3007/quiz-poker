---
titel: "ADR 0005: Konten mit Einladung, ohne E-Mail-Versand"
status: akzeptiert
erstellt: 2026-11-04
tags: [adr, architektur, konten]
---

# ADR (Architecture Decision Record) 0005: Konten mit Einladung, ohne E-Mail-Versand

Ersetzt in [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]] die offene Registrierung, die
Bestätigung per Link und die Bindung der Rolle Quiz-Master an ein Konto. Der Rest von ADR 0003 gilt weiter.

## Kontext

ADR 0003 sah offene Registrierung, Login mit E-Mail und Passwort sowie E-Mails zum Bestätigen und Zurücksetzen vor. Bei
der Klärung von Phase 3 kamen drei Fakten dazu, Stand 2026-11-04:

- **E-Mail braucht praktisch eine eigene Domain.** Resend schickt ohne geprüfte Domain nur an die eigene Adresse, Brevo
  warnt bei Gratis-Adressen vor Ablehnung und Spam, und Cloudflares Dienst verlangt für beliebige Empfänger den bezahlten
  Tarif. Das Projekt soll ohne eigene Domain auskommen.
- **Passwort-Hashing passt vermutlich nicht in einen Worker.** Der kostenlose Tarif erlaubt 10 ms Rechenzeit je Anfrage. Ein
  Durable Object darf laut Doku 30 Sekunden rechnen.
- **Offene Registrierung bedeutet fremde Inhalte und fremde Adressen,** obwohl die Seite nur für eine Freundesrunde da ist.

## Entscheidung

- **Kein E-Mail-Versand in Phase 3.** Die E-Mail-Adresse ist nur Login-Name und wird nicht geprüft.
- **Registrierung nur mit Einladungscode.** Der Entwickler erzeugt einmal gültige Codes per Befehl. Eine Adressliste wäre ohne
  Bestätigung wertlos, weil sich jeder mit der Adresse eines Freundes anmelden könnte.
- **Vergessenes Passwort:** Der Entwickler erzeugt per Befehl einen einmaligen Link und schickt ihn selbst weiter.
- **Login mit Passwort über Better Auth,** das Hashing läuft in einem Durable Object. Ein Test im echten Betrieb bei
  Cloudflare ist die erste Aufgabe für die Konten. Scheitert er, wird diese Zeile neu entschieden.
- **Spielraum und Einmal-Quiz gehen ohne Konto.** Ein Konto braucht nur, wer Quizze speichern oder öffentliche Quizze kopieren
  will. Auch mit Konto findet der Quiz-Master über das Token im Browser in die Partie zurück.

## Messung

Test im echten Betrieb am 2026-11-05 mit Better Auth 1.7.17 auf einem eigenen Wegwerf-Worker im kostenlosen Tarif. Je Weg 60
Anfragen in zwei Läufen, CPU-Zeit aus `wrangler tail` (Stichprobe, nicht jede Anfrage erscheint dort):

| Weg | Log-Zeilen | CPU P50 | CPU P90 | CPU max | Abgebrochen |
|---|---|---:|---:|---:|---:|
| Hashing im Durable Object | 47 | 135 ms | 163 ms | 179 ms | 0 von 60 |
| Hashing direkt im Worker | 35 | 131 ms | 201 ms | 216 ms | 2 von 60 |
| Anmelden, Teil im Worker | 22 | 7 ms | 15 ms | 19 ms | 0 von 60 |
| Registrieren, Teil im Worker | 2 | – | – | 49 ms | 0 von 2 |

Größe 1,77 MiB (Grenze 64 MiB), Start 41 bis 60 ms (Grenze 1 Sekunde).

**Urteil:** Das Hashing im Durable Object hält. Der Rest von Anmelden und Registrieren im Worker liegt zum Teil über den 10 ms,
ohne dass Cloudflare abgebrochen hat. Der Entwickler hat diesen Grenzfall am 2026-11-05 angenommen, weil Anmeldungen selten sind
und Spielräume den Weg nicht nutzen. Es bleibt das Risiko, dass eine Anmeldung selten mit einer Fehlerseite abbricht.

## Alternativen

- **Eigene Domain mit Mail-Dienst:** Der saubere Weg mit Bestätigung, Zurücksetzen und Magic Link, aber der Entwickler möchte
  ohne Domain auskommen.
- **Magic Link als Hauptweg:** Login per Link aus der Mail, ganz ohne Passwort und ohne Hashing-Problem. Braucht aber ebenfalls
  Mail. Vorgemerkt als zusätzliche Option, sobald es eine Domain gibt.
- **Kostenlose Subdomain oder Versand über ein eigenes Postfach per SMTP:** Nicht geprüft, ob Mail-Dienste die Subdomain
  annehmen. Beim Postfach läge dessen Passwort bei Cloudflare.
- **Bezahlter Tarif von Cloudflare:** Löst die Rechenzeit, aber nicht die Domain, und das Hosting soll kostenlos bleiben.
- **Spielraum nur mit Konto:** Einfacher, aber jeder Quiz-Master bräuchte eine Einladung, auch für einen spontanen Abend.

## Konsequenzen

- Der Entwickler erledigt Einladungen und vergessene Passwörter von Hand. Bei einer Freundesrunde trägt das, bei vielen Konten
  nicht mehr.
- Wechselt ein Quiz-Master mitten in der Partie das Gerät, kommt er auch mit Konto nicht zurück in seine Rolle.
- Das Einmal-Quiz schickt selbst erstellte Inhalte in den Spielraum, ohne Einladung. Der Server prüft deshalb auch dort die
  Größengrenzen.
- Kommt später eine Domain, müssen die Adressen bestehender Konten erst bestätigt werden, bevor Links an sie gehen.
