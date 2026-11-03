export const START_CHIPS = 100;
export const MINDESTEINSATZ = 10;

export function mindesteinsatzFuer(chips: number): number {
  return Math.min(MINDESTEINSATZ, chips);
}

export function istGueltigerEinsatz(einsatz: number, chips: number): boolean {
  return (
    Number.isInteger(einsatz) &&
    einsatz >= mindesteinsatzFuer(chips) &&
    einsatz <= chips
  );
}

export function chipsNachRunde(
  chips: number,
  einsatz: number,
  richtig: boolean,
): number {
  return richtig ? chips + einsatz : chips - einsatz;
}
