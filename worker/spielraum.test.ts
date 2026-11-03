import {
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { istGueltigerRaumcode } from "../src/regeln/raumcode";
import worker from "./index";
import type { Spielraum } from "./spielraum";
import type { QuizMasterAnsicht, SpielerAnsicht } from "../src/regeln/ansicht";
import {
  post,
  raumEroeffnen,
  raumMitAnnaUndBen,
  spielerAnlegen,
  verbinden,
} from "./testhilfen";

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
    const wert = Math.random();
    const zufall = vi.spyOn(Math, "random");
    zufall.mockReturnValue(wert);
    const erster = await post("/api/raeume");
    zufall.mockRestore();
    const wiederholt = vi.spyOn(Math, "random");
    wiederholt
      .mockReturnValueOnce(wert)
      .mockReturnValueOnce(wert)
      .mockReturnValueOnce(wert)
      .mockReturnValueOnce(wert)
      .mockReturnValue((wert + 0.5) % 1);
    const zweiter = await post("/api/raeume");

    expect(zweiter.status).toBe(201);
    expect(zweiter.daten.raumcode).not.toBe(erster.daten.raumcode);
  });
});

describe("Grenze für neue Spielräume", () => {
  it("antwortet über der Grenze mit 429, ohne einen Raum anzulegen", async () => {
    const antwort = await worker.fetch(
      new Request("https://quiz-poker.test/api/raeume", { method: "POST" }),
      { ...env, RAEUME_PRO_STUNDE: "0" },
    );

    expect(antwort.status).toBe(429);
    expect(await antwort.json()).toEqual({ code: "zu-viele-raeume" });
  });

  it("zählt im Zähler bis zur Grenze", async () => {
    const zaehler = env.RAUMZAEHLER.getByName("test-grenze");

    expect(await zaehler.raumZulassen(2)).toBe(true);
    expect(await zaehler.raumZulassen(2)).toBe(true);
    expect(await zaehler.raumZulassen(2)).toBe(false);
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

describe("Aktionen", () => {
  function alleGesetzt(ansicht: QuizMasterAnsicht) {
    return ansicht.spieler.every((spieler) => spieler.hatGesetzt);
  }
  function alleBereit(ansicht: QuizMasterAnsicht) {
    return ansicht.spieler.every((spieler) => spieler.istBereit);
  }

  it("spielt eine ganze Partie über WebSockets", async () => {
    const { quizMaster, anna, ben, annaId, benId } = await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "partie-starten" });
    await quizMaster.ansicht<QuizMasterAnsicht>((a) => a.phase === "einsatz");

    for (let runde = 0; runde < 9; runde++) {
      anna.senden({ typ: "einsatz-setzen", einsatz: 10 });
      ben.senden({ typ: "einsatz-setzen", einsatz: 10 });
      await quizMaster.ansicht<QuizMasterAnsicht>(alleGesetzt);
      quizMaster.senden({ typ: "frage-zeigen" });
      anna.senden({ typ: "antwort-bestaetigen", text: "Eins" });
      ben.senden({ typ: "antwort-bestaetigen", text: "Zwei" });
      await quizMaster.ansicht<QuizMasterAnsicht>(alleBereit);
      quizMaster.senden({ typ: "auswertung-starten" });
      quizMaster.senden({
        typ: "antwort-auswerten",
        spielerId: annaId,
        richtig: true,
      });
      quizMaster.senden({
        typ: "antwort-auswerten",
        spielerId: benId,
        richtig: false,
      });
      quizMaster.senden({ typ: "aufloesen" });
      await quizMaster.ansicht<QuizMasterAnsicht>(
        (a) => a.phase === "aufgeloest",
      );
      quizMaster.senden({ typ: "naechste-runde" });
      await quizMaster.ansicht<QuizMasterAnsicht>(
        (a) => a.phase === "einsatz" || a.phase === "beendet",
      );
    }

    const ende = await anna.ansicht((a) => a.phase === "beendet");
    expect(ende.sieger).toEqual([annaId]);
    expect(ende.spieler.find((s) => s.id === annaId)?.chips).toBe(190);
    expect(ende.spieler.find((s) => s.id === benId)?.chips).toBe(10);
  });

  it.each([
    { typ: "partie-starten" },
    { typ: "frage-zeigen" },
    { typ: "aufloesen" },
    { typ: "antwort-auswerten", spielerId: "x", richtig: true },
    { typ: "spieler-entfernen", spielerId: "x" },
    { typ: "raum-schliessen" },
    { typ: "rueckkehr-bestaetigen", spielerId: "x" },
  ] as const)("verbietet Spielern $typ", async (aktion) => {
    const { quizMaster, anna } = await raumMitAnnaUndBen();
    anna.senden(aktion);

    expect(await anna.naechste()).toEqual({
      typ: "fehler",
      code: "keine-berechtigung",
    });
    quizMaster.senden({ typ: "partie-starten" });
    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>();
    expect(ansicht.phase).toBe("einsatz");
  });

  it.each([
    { typ: "einsatz-setzen", einsatz: 10 },
    { typ: "antwort-bestaetigen", text: "Eins" },
    { typ: "antwort-zuruecknehmen" },
  ] as const)("verbietet dem Quiz-Master $typ", async (aktion) => {
    const { quizMaster } = await raumMitAnnaUndBen();
    quizMaster.senden(aktion);

    expect(await quizMaster.naechste()).toEqual({
      typ: "fehler",
      code: "keine-berechtigung",
    });
  });

  it("setzt nur den eigenen Einsatz und verrät ihn anderen nicht", async () => {
    const { quizMaster, anna, ben, annaId, benId } = await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "partie-starten" });
    await ben.ansicht((a) => a.phase === "einsatz");
    anna.senden({ typ: "einsatz-setzen", einsatz: 40 });

    const benSieht = await ben.ansicht<SpielerAnsicht>((a) =>
      a.spieler.some((s) => s.hatGesetzt),
    );
    const qmSieht = await quizMaster.ansicht<QuizMasterAnsicht>((a) =>
      a.spieler.some((s) => s.hatGesetzt),
    );

    expect(benSieht.spieler.find((s) => s.id === annaId)?.einsatz).toBeNull();
    expect(qmSieht.spieler.find((s) => s.id === annaId)?.einsatz).toBe(40);
    expect(qmSieht.spieler.find((s) => s.id === benId)?.hatGesetzt).toBe(false);
  });

  it("schickt einen Regelverstoß nur an den Absender", async () => {
    const { quizMaster, anna, ben } = await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "partie-starten" });
    await anna.ansicht((a) => a.phase === "einsatz");
    await ben.ansicht((a) => a.phase === "einsatz");
    anna.senden({ typ: "einsatz-setzen", einsatz: 5 });

    expect(await anna.naechste()).toEqual({
      typ: "fehler",
      code: "ungueltiger-einsatz",
    });
    quizMaster.senden({ typ: "frage-zeigen" });
    const naechste = await ben.naechste();
    expect(naechste).toMatchObject({
      typ: "ansicht",
      ansicht: { phase: "antworten" },
    });
    const beimQuizMaster = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.phase === "einsatz",
    );
    expect(beimQuizMaster.phase).toBe("einsatz");
  });

  it("meldet kaputte Nachrichten", async () => {
    const { anna } = await raumMitAnnaUndBen();
    anna.senden("kaputt");

    expect(await anna.naechste()).toEqual({
      typ: "fehler",
      code: "ungueltige-nachricht",
    });
  });

  it("behält Einsätze und Verbindungen nach dem Einschlafen", async () => {
    const { raumcode, quizMaster, anna, ben, annaId } =
      await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "partie-starten" });
    await quizMaster.ansicht<QuizMasterAnsicht>((a) => a.phase === "einsatz");
    anna.senden({ typ: "einsatz-setzen", einsatz: 40 });
    await quizMaster.ansicht<QuizMasterAnsicht>((a) =>
      a.spieler.some((s) => s.hatGesetzt),
    );

    await evictDurableObject(env.SPIELRAUM.getByName(raumcode));

    ben.senden({ typ: "einsatz-setzen", einsatz: 20 });
    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>((a) =>
      a.spieler.every((s) => s.hatGesetzt),
    );
    expect(ansicht.spieler.find((s) => s.id === annaId)?.einsatz).toBe(40);
    expect(ansicht.spieler.every((s) => s.verbunden)).toBe(true);
  });
});

describe("Rückkehr auf ein neues Gerät", () => {
  async function anfrageVonAnna(raumcode: string) {
    const { status, daten } = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "anna",
    });
    expect(status).toBe(202);
    return verbinden(raumcode, daten.token);
  }

  it("zeigt dem neuen Gerät vor der Bestätigung nichts vom Spielstand", async () => {
    const { raumcode, quizMaster, annaId } = await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);

    expect(await neu.naechste()).toEqual({ typ: "wartet-auf-bestaetigung" });
    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.rueckkehrAnfragen.length > 0,
    );
    expect(ansicht.rueckkehrAnfragen).toEqual([
      { spielerId: annaId, name: "Anna" },
    ]);
  });

  it("verbietet dem wartenden Gerät jede Aktion, auch die des Quiz-Masters", async () => {
    const { raumcode } = await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);
    await neu.naechste();

    for (const aktion of [
      { typ: "partie-starten" },
      { typ: "einsatz-setzen", einsatz: 10 },
    ] as const) {
      neu.senden(aktion);
      expect(await neu.naechste()).toEqual({
        typ: "fehler",
        code: "keine-berechtigung",
      });
    }
  });

  it("lehnt einen unbekannten Namen und Raum ab", async () => {
    const { raumcode } = await raumMitAnnaUndBen();
    const name = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "Niemand",
    });
    const raum = await post("/api/raeume/QQQX/rueckkehr", { name: "Anna" });

    expect(name.status).toBe(422);
    expect(name.daten.code).toBe("unbekannter-spieler");
    expect(raum.status).toBe(404);
  });

  it("übergibt nach der Bestätigung den Platz und sperrt das alte Gerät", async () => {
    const { raumcode, quizMaster, anna, annaId, annaToken } =
      await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);
    await neu.naechste();

    quizMaster.senden({ typ: "rueckkehr-bestaetigen", spielerId: annaId });

    const ansicht = await neu.ansicht();
    expect(ansicht.ichId).toBe(annaId);
    expect(ansicht.spieler.find((s) => s.id === annaId)?.chips).toBe(100);
    expect(await anna.geschlossen).toBe(4003);
    const fertig = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.rueckkehrAnfragen.length === 0,
    );
    expect(fertig.rueckkehrAnfragen).toEqual([]);

    const altesToken = await verbinden(raumcode, annaToken);
    expect(await altesToken.geschlossen).toBe(4001);
  });

  it("schließt das neue Gerät bei einer Ablehnung", async () => {
    const { raumcode, quizMaster, anna, annaId } = await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);
    await neu.naechste();

    quizMaster.senden({ typ: "rueckkehr-ablehnen", spielerId: annaId });

    expect(await neu.geschlossen).toBe(4001);
    quizMaster.senden({ typ: "partie-starten" });
    expect((await anna.ansicht((a) => a.phase === "einsatz")).ichId).toBe(
      annaId,
    );
  });

  it("lehnt eine zweite Anfrage ab, solange ein wartendes Gerät verbunden ist", async () => {
    const { raumcode, quizMaster } = await raumMitAnnaUndBen();
    const erste = await anfrageVonAnna(raumcode);
    await erste.naechste();

    const zweite = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "Anna",
    });

    expect(zweite.status).toBe(409);
    expect(zweite.daten.code).toBe("anfrage-laeuft");
    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.rueckkehrAnfragen.length > 0,
    );
    expect(ansicht.rueckkehrAnfragen).toHaveLength(1);
  });

  it("zeigt und bestätigt nur Anfragen von Geräten, die wirklich verbunden sind", async () => {
    const { raumcode, quizMaster, anna, annaId } = await raumMitAnnaUndBen();
    const ohneGeraet = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "Anna",
    });
    expect(ohneGeraet.status).toBe(202);

    quizMaster.senden({ typ: "rueckkehr-bestaetigen", spielerId: annaId });

    expect(await quizMaster.naechste()).toEqual({
      typ: "fehler",
      code: "unbekannter-spieler",
    });
    quizMaster.senden({ typ: "partie-starten" });
    expect((await anna.ansicht((a) => a.phase === "einsatz")).ichId).toBe(
      annaId,
    );
  });

  it("ersetzt eine Anfrage, deren Gerät sich nie verbunden hat", async () => {
    const { raumcode } = await raumMitAnnaUndBen();
    await post(`/api/raeume/${raumcode}/rueckkehr`, { name: "Anna" });

    const zweite = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "Anna",
    });

    expect(zweite.status).toBe(202);
  });

  it("entfernt die Anfrage, wenn sich das wartende Gerät trennt", async () => {
    const { raumcode, quizMaster } = await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);
    await neu.naechste();
    await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.rueckkehrAnfragen.length > 0,
    );

    neu.schliessen();

    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.rueckkehrAnfragen.length === 0,
    );
    expect(ansicht.rueckkehrAnfragen).toEqual([]);
    const danach = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: "Anna",
    });
    expect(danach.status).toBe(202);
  });

  it("schickt einem wartenden Gerät auch bei Änderungen keine Ansicht", async () => {
    const { raumcode, quizMaster } = await raumMitAnnaUndBen();
    const neu = await anfrageVonAnna(raumcode);
    await neu.naechste();

    quizMaster.senden({ typ: "partie-starten" });
    await quizMaster.ansicht<QuizMasterAnsicht>((a) => a.phase === "einsatz");
    neu.senden("kaputt");

    expect(await neu.naechste()).toEqual({
      typ: "fehler",
      code: "keine-berechtigung",
    });
  });

  it("meldet ungültige Eingaben auf dem Rückkehrweg mit 422", async () => {
    const { raumcode } = await raumMitAnnaUndBen();
    const antwort = await post(`/api/raeume/${raumcode}/rueckkehr`, {
      name: 5,
    });

    expect(antwort.status).toBe(422);
    expect(antwort.daten.code).toBe("ungueltige-nachricht");
  });
});

describe("Sonderfälle der Verbindung", () => {
  function verbindungVon(zustand: DurableObjectState, token: string) {
    const verbindung = zustand
      .getWebSockets()
      .find(
        (kandidat) =>
          (kandidat.deserializeAttachment() as { token: string }).token ===
          token,
      );
    if (!verbindung) {
      throw new Error("Verbindung nicht gefunden");
    }
    return verbindung;
  }

  it("ignoriert Nachrichten von Verbindungen, deren Token nicht mehr gilt", async () => {
    const { raumcode, quizMaster, annaToken } = await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "partie-starten" });
    await quizMaster.ansicht<QuizMasterAnsicht>((a) => a.phase === "einsatz");

    await runInDurableObject(
      env.SPIELRAUM.getByName(raumcode),
      async (raum: Spielraum, zustand) => {
        const stand = (await zustand.storage.get("stand")) as {
          spielerTokens: Record<string, string>;
          partie: { einsaetze: Record<string, number> };
        };
        delete stand.spielerTokens[annaToken];
        await zustand.storage.put("stand", stand);

        await raum.webSocketMessage(
          verbindungVon(zustand, annaToken),
          JSON.stringify({ typ: "einsatz-setzen", einsatz: 10 }),
        );

        const danach = (await zustand.storage.get("stand")) as typeof stand;
        expect(danach.partie.einsaetze).toEqual({});
      },
    );
  });

  it("stürzt nicht ab, wenn die Antwort auf eine schließende Verbindung ginge", async () => {
    const { raumcode, annaToken } = await raumMitAnnaUndBen();

    await runInDurableObject(
      env.SPIELRAUM.getByName(raumcode),
      async (raum: Spielraum, zustand) => {
        const verbindung = verbindungVon(zustand, annaToken);
        verbindung.close(4003, "Test");

        await expect(
          raum.webSocketMessage(verbindung, "kaputt"),
        ).resolves.toBeUndefined();
      },
    );
  });

  it("meldet nach einem Verbindungsfehler den Spieler als getrennt", async () => {
    const { raumcode, quizMaster, annaId, annaToken } =
      await raumMitAnnaUndBen();

    await runInDurableObject(
      env.SPIELRAUM.getByName(raumcode),
      async (raum: Spielraum, zustand) => {
        await raum.webSocketError(verbindungVon(zustand, annaToken));
      },
    );

    const ansicht = await quizMaster.ansicht<QuizMasterAnsicht>(
      (a) => a.spieler.find((s) => s.id === annaId)?.verbunden === false,
    );
    expect(ansicht.spieler.find((s) => s.id === annaId)?.verbunden).toBe(false);
  });

  it("lässt den Stand bei kaputten Nachrichten und falschen Tokens unverändert", async () => {
    const { raumcode, anna } = await raumMitAnnaUndBen();
    const raum = env.SPIELRAUM.getByName(raumcode);
    const lesen = () =>
      runInDurableObject(raum, (_, zustand) => zustand.storage.get("stand"));
    const vorher = await lesen();

    anna.senden("kaputt");
    await anna.naechste();
    const falsch = await verbinden(raumcode, "constructor");
    await falsch.geschlossen;

    expect(await lesen()).toEqual(vorher);
  });
});

describe("Spieler entfernen und Raum beenden", () => {
  it("schließt das Gerät eines entfernten Spielers, das Token gilt nicht mehr", async () => {
    const { raumcode, quizMaster, anna, ben, annaId, annaToken } =
      await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "spieler-entfernen", spielerId: annaId });

    expect(await anna.geschlossen).toBe(4003);
    const ansicht = await ben.ansicht((a) => a.spieler.length === 1);
    expect(ansicht.spieler[0].name).toBe("Ben");

    const erneut = await verbinden(raumcode, annaToken);
    expect(await erneut.geschlossen).toBe(4001);
  });

  it("schließt beim Raumende alle Geräte, ein Beitritt ist nicht mehr möglich", async () => {
    const { raumcode, quizMaster, anna } = await raumMitAnnaUndBen();
    quizMaster.senden({ typ: "raum-schliessen" });

    expect(await quizMaster.geschlossen).toBe(4002);
    expect(await anna.geschlossen).toBe(4002);
    const beitritt = await post(`/api/raeume/${raumcode}/spieler`, {
      name: "Cara",
    });
    expect(beitritt.status).toBe(404);
  });

  it("setzt bei jeder Aktion den Alarm auf 24 Stunden und löscht danach den Raum", async () => {
    const { raumcode, quizMaster, anna } = await raumMitAnnaUndBen();
    const raum = env.SPIELRAUM.getByName(raumcode);
    const vorher = await runInDurableObject(raum, (_, zustand) =>
      zustand.storage.getAlarm(),
    );
    const jetzt = Date.now();
    expect(vorher).toBeGreaterThan(jetzt + 23 * 60 * 60 * 1000);
    expect(vorher).toBeLessThanOrEqual(jetzt + 24 * 60 * 60 * 1000);

    await runInDurableObject(raum, (_, zustand) =>
      zustand.storage.setAlarm(Date.now() + 60_000),
    );
    quizMaster.senden({ typ: "partie-starten" });
    await anna.ansicht((a) => a.phase === "einsatz");
    const nachAktion = await runInDurableObject(raum, (_, zustand) =>
      zustand.storage.getAlarm(),
    );
    expect(nachAktion).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

    expect(await runDurableObjectAlarm(raum)).toBe(true);

    expect(await quizMaster.geschlossen).toBe(4002);
    expect(await anna.geschlossen).toBe(4002);
    const beitritt = await post(`/api/raeume/${raumcode}/spieler`, {
      name: "Cara",
    });
    expect(beitritt.status).toBe(404);
  });
});
