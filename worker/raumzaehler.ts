import { DurableObject } from "cloudflare:workers";
import { raumZulassen, type Raumzaehlung } from "../src/regeln/raumgrenze";

const SCHLUESSEL = "zaehlung";

/** Es gibt genau einen Zähler: Er begrenzt, wie viele Spielräume pro Stunde neu entstehen. */
export class Raumzaehler extends DurableObject<Env> {
  async raumZulassen(grenze: number): Promise<boolean> {
    const zaehlung = await this.ctx.storage.get<Raumzaehlung>(SCHLUESSEL);
    const ergebnis = raumZulassen(zaehlung, Date.now(), grenze);
    if (ergebnis.erlaubt) {
      await this.ctx.storage.put(SCHLUESSEL, ergebnis.zaehlung);
    }
    return ergebnis.erlaubt;
  }
}
