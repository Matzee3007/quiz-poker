// Spieler am Handy (Projekt „handy“: WebKit, iPhone 13 Mini, 375 px). Der Quiz-Master sitzt am Laptop.
import {
  devices,
  expect,
  test,
  type Browser,
  type Page,
} from "@playwright/test";

const HANDY = devices["iPhone 13 Mini"];

/** Quiz-Master eröffnet das Beispiel-Quiz am Laptop, Sophie und Tim treten am Handy über den Link bei. */
async function raumMitSpielern(browser: Browser) {
  const laptop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const quizMaster = await laptop.newPage();
  await quizMaster.goto("/");
  await quizMaster
    .getByRole("button", { name: "Beispiel-Quiz spielen" })
    .click();
  await expect(quizMaster).toHaveURL(/\/raum\/[A-Z0-9]{4}$/);
  const raumcode = new URL(quizMaster.url()).pathname.split("/").at(-1)!;

  async function beitreten(name: string): Promise<Page> {
    const seite = await (await browser.newContext(HANDY)).newPage();
    await seite.goto(`/raum/${raumcode}`);
    await seite.getByLabel("Dein Name").fill(name);
    await seite.getByRole("button", { name: "Beitreten" }).click();
    await expect(seite.locator(".raumcode")).toHaveText(raumcode);
    return seite;
  }

  const sophie = await beitreten("Sophie");
  const tim = await beitreten("Tim");
  return { quizMaster, sophie, tim, raumcode };
}

/** Die Seite ist nicht breiter als der Bildschirm. */
async function ohneSeitlichesScrollen(seite: Page) {
  const breite = await seite
    .locator("html")
    .evaluate((html) => html.scrollWidth);
  expect(breite).toBeLessThanOrEqual(seite.viewportSize()!.width);
}

test("Startseite, Beitreten und Warten passen auf 375 px", async ({
  browser,
}) => {
  const { sophie } = await raumMitSpielern(browser);
  await ohneSeitlichesScrollen(sophie);

  const start = await sophie.context().newPage();
  await start.goto("/");
  await ohneSeitlichesScrollen(start);
  const beitreten = await start
    .getByRole("heading", { name: "Spielraum beitreten" })
    .boundingBox();
  const eroeffnen = await start
    .getByRole("heading", { name: "Spielraum eröffnen" })
    .boundingBox();
  expect(beitreten!.y).toBeLessThan(eroeffnen!.y);
});
