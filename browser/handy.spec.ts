// Spieler am Handy (Projekt „handy“: WebKit, iPhone 13 Mini, 375 px). Der Quiz-Master sitzt am Laptop.
import {
  devices,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

// Offene Kontexte halten ihre WebSockets, ohne Schließen bremsen sie die folgenden Tests.
const kontexte: BrowserContext[] = [];

test.afterEach(async () => {
  await Promise.all(kontexte.splice(0).map((kontext) => kontext.close()));
});

async function beispielQuiz(quizMaster: Page) {
  await quizMaster.goto("/");
  await quizMaster
    .getByRole("button", { name: "Beispiel-Quiz spielen" })
    .click();
}

/** Einmal-Quiz mit einer einzigen Frage, damit die Partie nach einer Runde endet. */
async function einFrageQuiz(quizMaster: Page) {
  await quizMaster.goto("/");
  await quizMaster
    .getByRole("button", { name: "Eigenes Quiz erstellen" })
    .click();
  await quizMaster.getByLabel("Titel des Quiz").fill("Kurzes Quiz");
  await quizMaster.getByLabel("Name der Kategorie 1").fill("Zahlen");
  await quizMaster.getByLabel("Fragetext").fill("Was ist 6 mal 7?");
  await quizMaster.getByLabel("Musterlösung").fill("42");
  await quizMaster.getByRole("button", { name: "Spielraum eröffnen" }).click();
}

/** Quiz-Master eröffnet am Laptop einen Raum, Sophie und Tim treten am Handy über den Link bei. */
async function raumMitSpielern(
  browser: Browser,
  eroeffnen: (quizMaster: Page) => Promise<void> = beispielQuiz,
) {
  // Das Projekt „handy“ gibt jedem Kontext die iPhone-Einstellungen, der Laptop überschreibt sie.
  const laptop = await browser.newContext({
    ...devices["Desktop Safari"],
    viewport: { width: 1280, height: 800 },
  });
  kontexte.push(laptop);
  const quizMaster = await laptop.newPage();
  await eroeffnen(quizMaster);
  await expect(quizMaster).toHaveURL(/\/raum\/[A-Z0-9]{4}$/);
  const raumcode = new URL(quizMaster.url()).pathname.split("/").at(-1)!;

  async function beitreten(name: string): Promise<Page> {
    const handy = await browser.newContext();
    kontexte.push(handy);
    const seite = await handy.newPage();
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

test("Runde: Leiste zeigt Platz und Chips, Einsatz und Antwort per Daumen", async ({
  browser,
}) => {
  const { quizMaster, sophie } = await raumMitSpielern(browser);
  await quizMaster.getByRole("button", { name: "Partie starten" }).click();

  const leiste = sophie.locator(".rang-leiste");
  await expect(leiste).toContainText("Platz 1 von 2");
  await expect(leiste).toContainText("100");
  const rangliste = sophie.getByRole("button", { name: /Rangliste/ });
  await rangliste.click();
  await expect(sophie.getByLabel("Rangliste")).toContainText("Tim");
  await rangliste.click();
  await expect(sophie.getByLabel("Rangliste")).toBeHidden();

  const setzen = sophie.getByRole("button", { name: "Einsatz setzen" });
  expect((await setzen.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await setzen.click();
  await expect(
    sophie.getByRole("button", { name: "Einsatz ändern" }),
  ).toBeVisible();
  await ohneSeitlichesScrollen(sophie);

  await quizMaster.getByRole("button", { name: "Frage zeigen" }).click();
  await expect(sophie.getByText("Hauptstadt")).toBeVisible();
  // Musterlösung der ersten Frage im Beispiel-Quiz, erst in der Auflösung sichtbar
  await expect(sophie.locator("body")).not.toContainText("Canberra");
  await sophie.getByLabel(/Deine Antwort/).fill("Sydney");
  await sophie.getByRole("button", { name: "Bereit" }).click();
  await expect(sophie.getByText("Deine Antwort:")).toBeVisible();
  await ohneSeitlichesScrollen(sophie);
});

test("Auflösung und Ende passen auf 375 px", async ({ browser }) => {
  const { quizMaster, sophie } = await raumMitSpielern(browser, einFrageQuiz);
  await quizMaster.getByRole("button", { name: "Partie starten" }).click();
  await sophie.getByRole("button", { name: "Einsatz setzen" }).click();
  await quizMaster.getByRole("button", { name: "Frage zeigen" }).click();
  await sophie.getByLabel(/Deine Antwort/).fill("42");
  await sophie.getByRole("button", { name: "Bereit" }).click();
  await quizMaster.getByRole("button", { name: "Auswertung starten" }).click();
  await quizMaster.getByRole("button", { name: "Richtig" }).click();
  await quizMaster.getByRole("button", { name: "Auflösen" }).click();

  await expect(sophie.getByText("Musterlösung")).toBeVisible();
  await ohneSeitlichesScrollen(sophie);

  await quizMaster.getByRole("button", { name: "Weiter" }).click();
  await expect(sophie.getByLabel("Podest")).toBeVisible();
  await ohneSeitlichesScrollen(sophie);
});
