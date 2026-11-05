import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openSync } from "fontkit";

const pages = ["/", "/404.html"];
const liveOrigin = "https://ventris-tools.github.io";

// Ventris is a separate site, published from its own repository, so it is not in _site.
const otherSite = "/ventris/";

const pageWeightBudget = 50_000;

const fonts = ["Regular", "Medium"].map((weight) => openSync(`_site/fonts/JetBrainsMono-${weight}.woff2`));

// The fonts change the layout, so nothing is measured until they have loaded.
async function open(page, path) {
  await page.goto(path);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const path of pages) {
  test.describe(path, () => {
    // Chrome reports a blocked inline style or script as a console error, so this covers the CSP too.
    test("loads with no errors or failed requests", async ({ page }) => {
      const problems = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(error.message));
      page.on("requestfailed", (request) => problems.push(`${request.url()} failed`));
      page.on("response", (response) => {
        if (response.status() >= 400) problems.push(`${response.url()} returned ${response.status()}`);
      });

      await open(page, path);

      expect(problems).toEqual([]);
    });

    test("every link and file on this site exists", async ({ page, request, baseURL }) => {
      await open(page, path);

      const references = await page.$$eval("[href], [src], meta[property='og:image']", (elements) =>
        elements.map((element) => element.href || element.src || element.content),
      );
      const local = references
        .map((reference) => new URL(reference.replace(liveOrigin, baseURL)))
        .filter((url) => url.origin === baseURL && url.pathname !== otherSite);

      expect(local.length).toBeGreaterThan(0);
      for (const url of local) {
        const response = await request.get(url.href);
        expect(response.status(), url.pathname).toBe(200);
      }
    });

    test("every character is in the subset fonts", async ({ page }) => {
      await open(page, path);

      const text = await page.evaluate(() => document.body.textContent);
      const characters = [...new Set(text.replace(/[\n\r\t]/g, ""))];
      const missing = characters.filter(
        (character) => !fonts.every((font) => font.hasGlyphForCodePoint(character.codePointAt(0))),
      );

      expect(missing).toEqual([]);
    });

    for (const width of [320, 375, 768]) {
      test(`has no sideways scrolling at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, path);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    for (const colorScheme of ["light", "dark"]) {
      for (const width of [375, 1280]) {
        test(`has no accessibility problems in ${colorScheme} at ${width}px`, async ({ page }) => {
          await page.emulateMedia({ colorScheme });
          await page.setViewportSize({ width, height: 800 });
          await open(page, path);

          const { violations } = await new AxeBuilder({ page }).analyze();

          expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(", ")}`)).toEqual(
            [],
          );
        });
      }
    }
  });
}

test.describe("home page", () => {
  test("stays within its page weight budget", async ({ page }) => {
    const responses = [];
    page.on("response", (response) => responses.push(response));

    await open(page, "/");

    const bodies = await Promise.all(responses.map((response) => response.body()));
    const weight = bodies.reduce((total, body) => total + body.length, 0);

    expect(weight).toBeLessThanOrEqual(pageWeightBudget);
  });

  // styles.css promises this down to 620px tall, using constants measured by hand.
  for (const width of [880, 1280, 1920]) {
    test(`fits one screen at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, "/");

      for (const height of [620, 680, 720, 800, 900, 1080]) {
        await page.setViewportSize({ width, height });

        const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

        expect(overflow, `${width}x${height}`).toBeLessThanOrEqual(0);
      }
    });
  }
});
