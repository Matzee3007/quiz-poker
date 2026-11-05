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

## Magic Link

- **Link:** https://www.better-auth.com/docs/plugins/magic-link, Teil von Better Auth
- **Was:** Zusätzlicher Login per Link aus einer E-Mail, ohne Passwort. Der Hauptweg bleibt das Passwort.
- **Warum noch nicht:** Braucht einen Mail-Dienst und damit praktisch eine eigene Domain (siehe [[projects/quiz-poker/docs/adr/0005-konten-mit-einladung-ohne-e-mail|ADR 0005]]).
- **Wann prüfen:** Sobald das Projekt eine eigene Domain bekommt. Dann auch Bestätigen und Zurücksetzen per Mail einführen.
