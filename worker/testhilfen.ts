import { env, exports } from "cloudflare:workers";
import type { Aktion, ServerNachricht } from "../src/protokoll";
import type { QuizMasterAnsicht, SpielerAnsicht } from "../src/regeln/ansicht";
import { geheimnisErzeugen, geheimnisHash } from "./geheimnis";

export const BASIS = "https://quiz-poker.test";

export function neueAdresse() {
  return `konto-${crypto.randomUUID()}@beispiel.test`;
}

export async function einladungAnlegen() {
  const code = geheimnisErzeugen();
  await env.DB.prepare("INSERT INTO einladung (code_hash) VALUES (?)")
    .bind(await geheimnisHash(code))
    .run();
  return code;
}

/** Macht aus den Set-Cookie-Zeilen einer Antwort den Header Cookie für die nächste Anfrage. */
export function cookieAus(antwort: Response) {
  return antwort.headers
    .getSetCookie()
    .map((zeile) => zeile.split(";")[0])
    .join("; ");
}

/** Legt ein Konto über den echten Weg an und liefert das Cookie seiner Sitzung. */
export async function kontoAnlegen(email: string, passwort: string) {
  const antwort = await exports.default.fetch(
    `${BASIS}/api/konto/registrieren`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASIS },
      body: JSON.stringify({
        code: await einladungAnlegen(),
        email,
        passwort,
      }),
    },
  );
  await antwort.text();
  if (antwort.status !== 201) {
    throw new Error(`Konto nicht angelegt: ${antwort.status}`);
  }
  return cookieAus(antwort);
}

export async function post(pfad: string, daten?: unknown) {
  const antwort = await exports.default.fetch(`${BASIS}${pfad}`, {
    method: "POST",
    body: daten === undefined ? undefined : JSON.stringify(daten),
  });
  const text = await antwort.text();
  return {
    status: antwort.status,
    daten: (text === "" ? {} : JSON.parse(text)) as Record<string, string>,
  };
}

export async function raumEroeffnen(quiz?: unknown) {
  const { daten } = await post(
    "/api/raeume",
    quiz === undefined ? undefined : { quiz },
  );
  return { raumcode: daten.raumcode, token: daten.token };
}

export async function spielerAnlegen(raumcode: string, name: string) {
  const { daten } = await post(`/api/raeume/${raumcode}/spieler`, { name });
  return daten.token;
}

/** Eine offene Verbindung, die eingehende Nachrichten der Reihe nach bereithält. */
export interface Geraet {
  senden(aktion: Aktion | string): void;
  naechste(): Promise<ServerNachricht>;
  ansicht<T extends SpielerAnsicht | QuizMasterAnsicht = SpielerAnsicht>(
    bedingung?: (ansicht: T) => boolean,
  ): Promise<T>;
  geschlossen: Promise<number>;
  schliessen(): void;
}

export async function verbinden(
  raumcode: string,
  token: string,
): Promise<Geraet> {
  const antwort = await exports.default.fetch(
    `${BASIS}/api/raeume/${raumcode}/verbindung?token=${encodeURIComponent(token)}`,
    { headers: { Upgrade: "websocket" } },
  );
  const verbindung = antwort.webSocket;
  if (!verbindung) {
    throw new Error(`Keine Verbindung, Status ${antwort.status}`);
  }

  const eingang: ServerNachricht[] = [];
  const wartende: ((nachricht: ServerNachricht) => void)[] = [];
  verbindung.addEventListener("message", (ereignis) => {
    const nachricht = JSON.parse(ereignis.data as string) as ServerNachricht;
    const wartender = wartende.shift();
    if (wartender) {
      wartender(nachricht);
    } else {
      eingang.push(nachricht);
    }
  });
  const geschlossen = new Promise<number>((erfuellt) => {
    verbindung.addEventListener("close", (ereignis) => {
      erfuellt(ereignis.code);
    });
  });
  verbindung.accept();

  const naechste = () => {
    const vorhanden = eingang.shift();
    return vorhanden
      ? Promise.resolve(vorhanden)
      : new Promise<ServerNachricht>((erfuellt) => {
          wartende.push(erfuellt);
        });
  };

  return {
    senden(aktion) {
      verbindung.send(
        typeof aktion === "string" ? aktion : JSON.stringify(aktion),
      );
    },
    naechste,
    async ansicht<T extends SpielerAnsicht | QuizMasterAnsicht>(
      bedingung: (ansicht: T) => boolean = () => true,
    ) {
      for (;;) {
        const nachricht = await naechste();
        if (nachricht.typ === "ansicht" && bedingung(nachricht.ansicht as T)) {
          return nachricht.ansicht as T;
        }
      }
    },
    geschlossen,
    schliessen() {
      verbindung.close();
    },
  };
}

/** Ein Raum mit Quiz-Master, Anna und Ben: alle verbunden, alle Eingänge leer. */
export async function raumMitAnnaUndBen(quiz?: unknown) {
  const { raumcode, token } = await raumEroeffnen(quiz);
  const annaToken = await spielerAnlegen(raumcode, "Anna");
  const benToken = await spielerAnlegen(raumcode, "Ben");
  const quizMaster = await verbinden(raumcode, token);
  const anna = await verbinden(raumcode, annaToken);
  const ben = await verbinden(raumcode, benToken);

  const alleVerbunden = (ansicht: SpielerAnsicht | QuizMasterAnsicht) =>
    ansicht.spieler.every((spieler) => spieler.verbunden);
  const stand = await quizMaster.ansicht<QuizMasterAnsicht>(alleVerbunden);
  await anna.ansicht(alleVerbunden);
  await ben.ansicht(alleVerbunden);

  const idVon = (name: string) =>
    stand.spieler.find((spieler) => spieler.name === name)?.id as string;

  return {
    raumcode,
    quizMaster,
    anna,
    ben,
    annaToken,
    benToken,
    annaId: idVon("Anna"),
    benId: idVon("Ben"),
  };
}
