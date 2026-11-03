// Ohne O und I, damit man den Code am Tisch nicht mit 0 und 1 verwechselt.
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LAENGE = 4;

export function raumcodeErzeugen(zufall: () => number = Math.random): string {
  let code = "";
  for (let stelle = 0; stelle < LAENGE; stelle++) {
    code += ALPHABET[Math.floor(zufall() * ALPHABET.length)];
  }
  return code;
}

export function istGueltigerRaumcode(code: string): boolean {
  return (
    code.length === LAENGE &&
    [...code].every((zeichen) => ALPHABET.includes(zeichen))
  );
}
