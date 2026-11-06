import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  einladungSql,
  linkGueltigBis,
  passwortLinkSql,
  quizLoeschenSql,
} from "./betrieb";
import { geheimnisErzeugen, geheimnisHash } from "./geheimnis";
import { anQuizze, BASIS, kontoAnlegen, neueAdresse } from "./testhilfen";

function post(pfad: string, daten: unknown) {
  return exports.default.fetch(`${BASIS}${pfad}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASIS },
    body: JSON.stringify(daten),
  });
}

async function linkEintragen(email: string, gueltigBis: number) {
  const token = geheimnisErzeugen();
  await env.DB.prepare(
    passwortLinkSql(await geheimnisHash(token), email, gueltigBis),
  ).run();
  return token;
}

describe("Befehle für den Betreiber", () => {
  it("erzeugt eine Einladung, die über die Registrierung funktioniert", async () => {
    const code = geheimnisErzeugen();
    await env.DB.prepare(einladungSql(await geheimnisHash(code))).run();

    const antwort = await post("/api/konto/registrieren", {
      code,
      email: neueAdresse(),
      passwort: "geheim-123",
    });
    await antwort.text();

    expect(antwort.status).toBe(201);
  });

  it("erzeugt einen Link, der das Passwort neu setzt", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, "geheim-123");

    const antwort = await post("/api/konto/passwort-neu", {
      token: await linkEintragen(email, linkGueltigBis(Date.now())),
      passwort: "ganz-neu-456",
    });
    await antwort.text();

    expect(antwort.status).toBe(204);
  });

  it("findet das Konto auch bei anderer Schreibweise der Adresse", async () => {
    const email = neueAdresse();
    await kontoAnlegen(email, "geheim-123");

    const antwort = await post("/api/konto/passwort-neu", {
      token: await linkEintragen(
        email.toUpperCase(),
        linkGueltigBis(Date.now()),
      ),
      passwort: "ganz-neu-456",
    });
    await antwort.text();

    expect(antwort.status).toBe(204);
  });

  it("kommt mit einem Apostroph in der Adresse zurecht", async () => {
    const email = `o'brien-${crypto.randomUUID()}@beispiel.test`;
    await kontoAnlegen(email, "geheim-123");

    const antwort = await post("/api/konto/passwort-neu", {
      token: await linkEintragen(email, linkGueltigBis(Date.now())),
      passwort: "ganz-neu-456",
    });
    await antwort.text();

    expect(antwort.status).toBe(204);
  });

  it("macht Links 24 Stunden lang gültig", () => {
    const jetzt = 1_000_000;

    expect(linkGueltigBis(jetzt)).toBe(jetzt + 86_400_000);
  });
});

describe("Quiz löschen", () => {
  const QUIZ = { titel: "T", kategorien: [] };

  async function quizAnlegen(cookie: string) {
    const antwort = await anQuizze(cookie, "POST", "", { quiz: QUIZ });
    return ((await antwort.json()) as { id: string }).id;
  }

  async function gibtEs(id: string) {
    return (
      (await env.DB.prepare("SELECT id FROM quiz WHERE id = ?")
        .bind(id)
        .first()) !== null
    );
  }

  it("löscht genau das Quiz mit dieser ID", async () => {
    const cookie = await kontoAnlegen(neueAdresse(), "geheim-123");
    const weg = await quizAnlegen(cookie);
    const bleibt = await quizAnlegen(cookie);

    await env.DB.prepare(quizLoeschenSql(weg)).run();

    expect(await gibtEs(weg)).toBe(false);
    expect(await gibtEs(bleibt)).toBe(true);
  });

  it("lässt sich nicht mit SQL in der ID überlisten", async () => {
    const cookie = await kontoAnlegen(neueAdresse(), "geheim-123");
    const bleibt = await quizAnlegen(cookie);

    await env.DB.prepare(quizLoeschenSql("x' OR '1'='1")).run();

    expect(await gibtEs(bleibt)).toBe(true);
  });
});
