import { describe, expect, it } from "vitest";
import { aktionLesen, type Aktion } from "./protokoll";

describe("Aktionen lesen", () => {
  const gueltig: Aktion[] = [
    { typ: "partie-starten" },
    { typ: "frage-zeigen" },
    { typ: "auswertung-starten" },
    { typ: "aufloesen" },
    { typ: "naechste-runde" },
    { typ: "raum-schliessen" },
    { typ: "einsatz-setzen", einsatz: 20 },
    { typ: "antwort-bestaetigen", text: "Berlin" },
    { typ: "antwort-zuruecknehmen" },
    { typ: "antwort-auswerten", spielerId: "anna", richtig: false },
    { typ: "rueckkehr-bestaetigen", spielerId: "anna" },
    { typ: "rueckkehr-ablehnen", spielerId: "anna" },
    { typ: "spieler-entfernen", spielerId: "anna" },
  ];

  it.each(gueltig)("liest $typ", (aktion) => {
    expect(aktionLesen(JSON.stringify(aktion))).toEqual(aktion);
  });

  it.each([
    "kaputt",
    "null",
    "[]",
    "12",
    '{"typ":"unbekannt"}',
    '{"typ":"constructor"}',
    '{"typ":"einsatz-setzen","einsatz":"20"}',
    '{"typ":"einsatz-setzen"}',
    '{"typ":"antwort-bestaetigen"}',
    '{"typ":"antwort-auswerten","spielerId":"anna"}',
    '{"typ":"antwort-auswerten","spielerId":"anna","richtig":"ja"}',
    '{"typ":"spieler-entfernen","spielerId":5}',
  ])("lehnt %s ab", (roh) => {
    expect(aktionLesen(roh)).toBeNull();
  });

  it("übernimmt keine zusätzlichen Felder", () => {
    expect(
      aktionLesen('{"typ":"einsatz-setzen","einsatz":20,"spielerId":"ben"}'),
    ).toEqual({ typ: "einsatz-setzen", einsatz: 20 });
  });
});
