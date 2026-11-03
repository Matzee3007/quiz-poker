const FENSTER_MS = 60 * 60 * 1000;

export interface Raumzaehlung {
  fensterBeginn: number;
  anzahl: number;
}

/** Entscheidet, ob ein weiterer Spielraum eröffnet werden darf: höchstens `grenze` pro Stunde. */
export function raumZulassen(
  zaehlung: Raumzaehlung | undefined,
  jetzt: number,
  grenze: number,
): { erlaubt: boolean; zaehlung: Raumzaehlung } {
  const aktuell =
    zaehlung && jetzt - zaehlung.fensterBeginn < FENSTER_MS
      ? zaehlung
      : { fensterBeginn: jetzt, anzahl: 0 };

  if (aktuell.anzahl >= grenze) {
    return { erlaubt: false, zaehlung: aktuell };
  }
  return {
    erlaubt: true,
    zaehlung: { ...aktuell, anzahl: aktuell.anzahl + 1 },
  };
}
