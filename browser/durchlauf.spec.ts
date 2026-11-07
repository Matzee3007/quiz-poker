// Durchlauf durch die Oberfläche wie ein Mensch: Konto, Meine Quizze, Editor, Spielraum.
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const PASSWORT = "playwright-passwort";

/** Erzeugt eine Einladung in der lokalen D1 und gibt ihren Link zurück. */
function einladungHolen(): string {
  const ausgabe = execFileSync("node", ["scripts/einladung.ts", "--lokal"], {
    encoding: "utf8",
  });
  return ausgabe.trim().split("\n").at(-1)!;
}

/** Löscht das Test-Konto dieses Laufs in der lokalen D1, seine Quizze löscht D1 mit. */
function testKontoLoeschen(email: string) {
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "quiz-poker",
      "--local",
      "--command",
      `DELETE FROM "user" WHERE email = '${email}'`,
    ],
    // Fehlermeldungen von wrangler bleiben sichtbar, wie in scripts/datenbank.ts.
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}

async function anmelden(page: Page, email: string) {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORT);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("heading", { name: "Dein Konto" })).toBeVisible();
}

/** Löst eine neue Einladung ein und landet angemeldet auf der Konto-Seite. */
async function registrieren(page: Page, email: string) {
  await page.goto(einladungHolen());
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORT);
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page.getByRole("heading", { name: "Dein Konto" })).toBeVisible();
}

/** Die Kachel eines Quiz in „Meine Quizze“ oder in der Sammlung. */
function kachel(page: Page, titel: string) {
  return page.locator("article.kachel", {
    has: page.getByRole("heading", { name: titel, exact: true }),
  });
}

/** Prüft, dass die Seite ein Spielraum ist und seinen Raumcode zeigt. */
async function raumcodeSichtbar(page: Page) {
  await expect(page).toHaveURL(/\/raum\/[A-Z0-9]{4}$/);
  const raumcode = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.locator(".raumcode")).toHaveText(raumcode);
}

test.describe("mit Konto", () => {
  test.describe.configure({ mode: "serial" });

  const email = `test-${Date.now()}@beispiel.de`;
  const zweiteEmail = `test-${Date.now()}-zwei@beispiel.de`;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  // Der letzte Test löscht das Konto über die Oberfläche. Bricht ein Test vorher ab, räumt das hier auf.
  test.afterAll(async () => {
    testKontoLoeschen(email);
    testKontoLoeschen(zweiteEmail);
    await page?.close();
  });

  test("Konto: registrieren, abmelden, anmelden", async () => {
    await registrieren(page, email);
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page.getByText("Du bist abgemeldet.")).toBeVisible();

    await anmelden(page, email);
  });

  test("Meine Quizze: unfertig speichern, neu laden, fertig schreiben", async () => {
    await page.getByRole("button", { name: "Zu meinen Quizzen" }).click();
    await expect(page.getByText("0 von 20 Quizzen")).toBeVisible();
    await page.getByRole("button", { name: "Erstes Quiz anlegen" }).click();
    await expect(page).toHaveURL(/\/quiz\/[0-9a-f-]{36}$/);

    await page.getByLabel("Titel des Quiz").fill("Playwright-Quiz");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Titel des Quiz")).toHaveValue(
      "Playwright-Quiz",
    );

    await page.getByLabel("Name der Kategorie 1").fill("Tiere");
    await page.getByLabel("Fragetext").fill("Wie viele Beine hat eine Spinne?");
    await page.getByLabel("Musterlösung").fill("8");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Zurück zu Meine Quizze" }).click();
    await expect(page.getByText("1 von 20 Quizzen")).toBeVisible();
    await expect(page.getByText("spielbar", { exact: true })).toBeVisible();
  });

  test("Editor: Rückfrage bei ungespeicherten Änderungen", async () => {
    await page.getByRole("button", { name: "Bearbeiten" }).click();
    await page.getByLabel("Titel des Quiz").fill("Nicht gespeichert");
    await expect(page.getByText("Ungespeicherte Änderungen")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByRole("button", { name: "Zurück zu Meine Quizze" }).click();
    await expect(page).toHaveURL(/\/quiz\//);
    await expect(page.getByLabel("Titel des Quiz")).toHaveValue(
      "Nicht gespeichert",
    );

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Zurück zu Meine Quizze" }).click();
    await expect(page).toHaveURL(/\/quizze$/);
    await expect(
      page.getByRole("heading", { name: "Playwright-Quiz" }),
    ).toBeVisible();
  });

  test("Spielen: gespeichertes Quiz eröffnet einen Spielraum", async () => {
    await page.getByRole("button", { name: "Spielen" }).click();
    await raumcodeSichtbar(page);
    await expect(page.getByText("Playwright-Quiz")).toBeVisible();
  });

  test("Veröffentlichen: Quiz steht ohne Konto in der Sammlung", async ({
    browser,
  }) => {
    await page.goto("/quizze");
    const schalter = kachel(page, "Playwright-Quiz").getByRole("switch");
    await expect(schalter).toHaveAttribute("aria-checked", "false");
    await schalter.click();
    await expect(schalter).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("steht in der Sammlung")).toBeVisible();

    const gast = await browser.newPage();
    await gast.goto("/");
    await gast.getByRole("button", { name: "Öffentliche Quizze" }).click();
    await expect(gast).toHaveURL(/\/sammlung$/);
    const karte = kachel(gast, "Playwright-Quiz");
    await expect(karte.getByText("Tiere")).toBeVisible();
    await expect(karte.getByRole("button", { name: "Kopieren" })).toHaveCount(
      0,
    );
    await karte.getByRole("button", { name: "Spielen" }).click();
    await raumcodeSichtbar(gast);
    await expect(gast.getByText("Playwright-Quiz")).toBeVisible();
    await gast.close();
  });

  test("Kopieren: zweites Konto übernimmt, privat gestellt verschwindet", async ({
    browser,
  }) => {
    const zweites = await browser.newPage();
    await registrieren(zweites, zweiteEmail);
    await zweites.goto("/sammlung");
    await kachel(zweites, "Playwright-Quiz")
      .getByRole("button", { name: "Kopieren" })
      .click();
    await expect(zweites).toHaveURL(/\/quiz\/[0-9a-f-]{36}$/);
    await expect(zweites.getByLabel("Titel des Quiz")).toHaveValue(
      "Playwright-Quiz",
    );

    await zweites.goto("/sammlung");
    await expect(kachel(zweites, "Playwright-Quiz")).toBeVisible();
    // Der Ersteller stellt das Quiz privat, während die Sammlung noch offen ist (Prüf-Schwerpunkt 2).
    await page.goto("/quizze");
    await kachel(page, "Playwright-Quiz").getByRole("switch").click();
    await expect(
      kachel(page, "Playwright-Quiz").getByRole("switch"),
    ).toHaveAttribute("aria-checked", "false");

    await kachel(zweites, "Playwright-Quiz")
      .getByRole("button", { name: "Kopieren" })
      .click();
    await expect(zweites.getByRole("alert")).toHaveText(
      "Dieses Quiz gibt es nicht mehr.",
    );
    await expect(kachel(zweites, "Playwright-Quiz")).toHaveCount(0);

    // Dasselbe für „Spielen“: wieder öffentlich, Sammlung neu laden, dann wieder privat.
    await kachel(page, "Playwright-Quiz").getByRole("switch").click();
    await expect(
      kachel(page, "Playwright-Quiz").getByRole("switch"),
    ).toHaveAttribute("aria-checked", "true");
    await zweites.goto("/sammlung");
    await expect(kachel(zweites, "Playwright-Quiz")).toBeVisible();
    await kachel(page, "Playwright-Quiz").getByRole("switch").click();
    await expect(
      kachel(page, "Playwright-Quiz").getByRole("switch"),
    ).toHaveAttribute("aria-checked", "false");
    await kachel(zweites, "Playwright-Quiz")
      .getByRole("button", { name: "Spielen" })
      .click();
    await expect(zweites.getByRole("alert")).toHaveText(
      "Dieses Quiz gibt es nicht mehr.",
    );
    await expect(kachel(zweites, "Playwright-Quiz")).toHaveCount(0);
    await zweites.close();
  });

  test("Editor: öffentliches Quiz bleibt spielbar, Auf privat stellen", async () => {
    await page.goto("/quizze");
    await kachel(page, "Playwright-Quiz").getByRole("switch").click();
    await kachel(page, "Playwright-Quiz")
      .getByRole("button", { name: "Bearbeiten" })
      .click();
    await expect(page.getByText("Dieses Quiz ist öffentlich")).toBeVisible();

    await page.getByLabel("Musterlösung").fill("");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Ein öffentliches Quiz muss spielbar bleiben. Fülle alle Felder aus oder stelle es zuerst auf privat.",
    );

    await page.getByRole("button", { name: "Auf privat stellen" }).click();
    await expect(page.getByText("Dieses Quiz ist öffentlich")).toHaveCount(0);
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
  });

  test("Vorlage: Beispiel-Quiz als eigenes Quiz", async () => {
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Zurück zu Meine Quizze" }).click();
    await page
      .getByRole("button", { name: "Beispiel-Quiz als Vorlage" })
      .click();
    await expect(page).toHaveURL(/\/quiz\/[0-9a-f-]{36}$/);
    await expect(page.getByLabel("Titel des Quiz")).toHaveValue(
      "Beispiel-Quiz",
    );
  });

  test("Aufräumen: Konto löschen", async () => {
    await page.goto("/konto");
    await page.getByRole("button", { name: "Konto löschen" }).click();
    await page.getByLabel("Passwort zur Bestätigung").fill(PASSWORT);
    await page.getByRole("button", { name: "Konto endgültig löschen" }).click();
    await expect(page.getByText("Dein Konto ist gelöscht.")).toBeVisible();

    await page.goto("/quizze");
    await expect(page).toHaveURL(/\/anmelden$/);
  });
});

test.describe("ohne Konto", () => {
  test("Beispiel-Quiz eröffnet einen Spielraum", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Beispiel-Quiz spielen" }).click();
    await raumcodeSichtbar(page);
    await expect(page.getByText("Beispiel-Quiz")).toBeVisible();
  });

  test("Einmal-Quiz eröffnet einen Spielraum", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Eigenes Quiz erstellen" }).click();
    await page.getByLabel("Titel des Quiz").fill("Einmal-Quiz aus Playwright");
    await page.getByLabel("Name der Kategorie 1").fill("Zahlen");
    await page.getByLabel("Fragetext").fill("Was ist 6 mal 7?");
    await page.getByLabel("Musterlösung").fill("42");
    await page.getByRole("button", { name: "Spielraum eröffnen" }).click();
    await raumcodeSichtbar(page);
    await expect(page.getByText("Einmal-Quiz aus Playwright")).toBeVisible();
  });
});
