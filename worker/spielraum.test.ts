import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { istGueltigerRaumcode } from "../src/regeln/raumcode";
import type { QuizMasterAnsicht } from "../src/regeln/ansicht";
import { post, raumEroeffnen, spielerAnlegen, verbinden } from "./testhilfen";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Spielraum eröffnen", () => {
  it("liefert einen gültigen Raumcode und ein Token", async () => {
    const { status, daten } = await post("/api/raeume");

    expect(status).toBe(201);
    expect(istGueltigerRaumcode(daten.raumcode)).toBe(true);
    expect(daten.token).toBeTruthy();
  });

  it("nimmt einen anderen Code, wenn einer schon belegt ist", async () => {
    const zufall = vi.spyOn(Math, "random");
    zufall.mockReturnValue(0);
    const erster = await post("/api/raeume");
    zufall
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5);
    const zweiter = await post("/api/raeume");

    expect(erster.daten.raumcode).toBe("AAAA");
    expect(zweiter.status).toBe(201);
    expect(zweiter.daten.raumcode).not.toBe("AAAA");
  });
});

describe("Spielraum beitreten", () => {
  it("liefert ein Token", async () => {
    const { raumcode } = await raumEroeffnen();
    const { status, daten } = await post(`/api/raeume/${raumcode}/spieler`, {
      name: "Anna",
    });

    expect(status).toBe(201);
    expect(daten.token).toBeTruthy();
  });

  it("antwortet bei unbekanntem oder ungültigem Raum mit 404", async () => {
    const unbekannt = await post("/api/raeume/QQQQ/spieler", { name: "Anna" });
    const ungueltig = await post("/api/raeume/constructor/spieler", {
      name: "Anna",
    });

    expect(unbekannt.status).toBe(404);
    expect(ungueltig.status).toBe(404);
  });

  it("meldet doppelte Namen mit 409", async () => {
    const { raumcode } = await raumEroeffnen();
    await spielerAnlegen(raumcode, "Anna");
    const { status, daten } = await post(`/api/raeume/${raumcode}/spieler`, {
      name: "anna",
    });

    expect(status).toBe(409);
    expect(daten.code).toBe("name-vergeben");
  });

  it("meldet ungültige Eingaben mit 422", async () => {
    const { raumcode } = await raumEroeffnen();
    const zuLang = await post(`/api/raeume/${raumcode}/spieler`, {
      name: "a".repeat(21),
    });
    const keinText = await post(`/api/raeume/${raumcode}/spieler`, {
      name: 5,
    });
    const keinJson = await exports.default.fetch(
      `https://quiz-poker.test/api/raeume/${raumcode}/spieler`,
      { method: "POST", body: "kaputt" },
    );
    await keinJson.text();

    expect(zuLang.status).toBe(422);
    expect(zuLang.daten.code).toBe("name-zu-lang");
    expect(keinText.status).toBe(422);
    expect(keinJson.status).toBe(422);
  });
});

describe("Verbindung", () => {
  it("schickt jeder Rolle sofort ihre Ansicht", async () => {
    const { raumcode, token } = await raumEroeffnen();
    const annaToken = await spielerAnlegen(raumcode, "Anna");
    const quizMaster = await verbinden(raumcode, token);
    const anna = await verbinden(raumcode, annaToken);

    const qmAnsicht = await quizMaster.ansicht<QuizMasterAnsicht>();
    const annaAnsicht = await anna.ansicht();

    expect(qmAnsicht.rolle).toBe("quiz-master");
    expect(qmAnsicht.phase).toBe("warten");
    expect(annaAnsicht.rolle).toBe("spieler");
    expect(annaAnsicht.spieler[0].name).toBe("Anna");
    expect(annaAnsicht.ichId).toBe(annaAnsicht.spieler[0].id);
    quizMaster.schliessen();
    anna.schliessen();
  });

  it("zeigt allen einen neuen Spieler und den Verbindungsstatus", async () => {
    const { raumcode, token } = await raumEroeffnen();
    const quizMaster = await verbinden(raumcode, token);
    await quizMaster.ansicht();

    const benToken = await spielerAnlegen(raumcode, "Ben");
    const nachBeitritt = await quizMaster.ansicht<QuizMasterAnsicht>();
    expect(nachBeitritt.spieler[0]).toMatchObject({
      name: "Ben",
      verbunden: false,
    });

    const ben = await verbinden(raumcode, benToken);
    const verbunden = await quizMaster.ansicht<QuizMasterAnsicht>();
    expect(verbunden.spieler[0].verbunden).toBe(true);

    ben.schliessen();
    const getrennt = await quizMaster.ansicht<QuizMasterAnsicht>(
      (ansicht) => !ansicht.spieler[0].verbunden,
    );
    expect(getrennt.spieler[0].verbunden).toBe(false);
    quizMaster.schliessen();
  });

  it.each(["falsch", "constructor", "__proto__"])(
    "schließt die Verbindung mit dem Token %s",
    async (falschesToken) => {
      const { raumcode } = await raumEroeffnen();
      const geraet = await verbinden(raumcode, falschesToken);

      expect(await geraet.geschlossen).toBe(4001);
    },
  );

  it("antwortet ohne WebSocket mit 426", async () => {
    const { raumcode, token } = await raumEroeffnen();
    const antwort = await exports.default.fetch(
      `https://quiz-poker.test/api/raeume/${raumcode}/verbindung?token=${token}`,
    );
    await antwort.text();

    expect(antwort.status).toBe(426);
  });

  it("schließt die alte Verbindung, wenn dasselbe Token neu verbindet", async () => {
    const { raumcode } = await raumEroeffnen();
    const annaToken = await spielerAnlegen(raumcode, "Anna");
    const alt = await verbinden(raumcode, annaToken);
    await alt.ansicht();
    const neu = await verbinden(raumcode, annaToken);

    expect(await alt.geschlossen).toBe(4003);
    expect((await neu.ansicht()).spieler[0].verbunden).toBe(true);
    neu.schliessen();
  });
});
