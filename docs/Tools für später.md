---
titel: Tools für später
status: aktiv
erstellt: 2026-11-02
tags: [tools, später]
---

# Tools für später

Werkzeuge, die für dieses Projekt interessant sind, aber jetzt noch nicht passen. Gehört zu [[projects/quiz-poker/docs/Projektvision|Projektvision]].
Beim Start jeder Phase prüfen (Regel der globalen `CLAUDE.md`). Werkzeuge für alle Projekte stehen in den
[[docs/Tools für später|Tools für später des Ecosystems]].

Aufbau je Eintrag:

```markdown
## <Werkzeug>

- **Link:** <URL>, <Lizenz>
- **Was:** <ein bis zwei Sätze>
- **Warum noch nicht:** <Grund>
- **Wann prüfen:** <Phase oder Anlass>
```

## @cloudflare/vitest-plugin

- **Link:** https://developers.cloudflare.com/workers/testing/vitest-integration/get-started/, Lizenz vor dem Einsatz prüfen
- **Was:** Führt Vitest-Tests in der Cloudflare-Laufzeit aus, damit sich Durable Objects und WebSockets testen lassen.
- **Warum noch nicht:** Bisher gibt es kein Durable Object. Der Worker lässt sich direkt aufrufen.
- **Wann prüfen:** Start von Phase 2. Dann auch prüfen, ob es Vitest 5 unterstützt.

## Cloudflare D1

- **Link:** https://developers.cloudflare.com/d1/, Dienst von Cloudflare
- **Was:** SQL-Datenbank für die Quiz-Sammlung und die Konten (siehe [[projects/quiz-poker/docs/adr/0002-quiz-sammlung-mit-d1|ADR 0002]]).
- **Warum noch nicht:** Bis Phase 2 reicht ein fest eingebautes Beispiel-Quiz.
- **Wann prüfen:** Start von Phase 3.

## Better Auth

- **Link:** https://www.better-auth.com/, Lizenz vor dem Einsatz prüfen
- **Was:** Bibliothek für Login mit E-Mail und Passwort (siehe [[projects/quiz-poker/docs/adr/0003-konten-nur-fuer-quiz-master|ADR 0003]]).
- **Warum noch nicht:** Konten kommen erst in Phase 3.
- **Wann prüfen:** Start von Phase 3. Dann prüfen, ob sie mit D1 zusammenarbeitet und welcher Dienst die E-Mails verschickt.
