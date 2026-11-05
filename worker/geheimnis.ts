/** Erzeugt einen nicht erratbaren Wert für Einladungscodes und Links: 32 Zufallsbytes als Base64url. */
export function geheimnisErzeugen(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/** Die Datenbank kennt nur diesen Hash. Ein Datenleck verrät deshalb keine gültigen Codes. */
export async function geheimnisHash(text: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
