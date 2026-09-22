// Real Chromium rendering/accessibility checks against an isolated static renderer fixture.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import sharp from "sharp";
const dir = await mkdtemp(join(tmpdir(), "omnisite-browser-"));
let browser, server;
try {
  const entry = `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {SiteView} from ${JSON.stringify(resolve("src/modules/omnisite/SiteView.tsx"))};
 export function render(layout,surface){return renderToStaticMarkup(<SiteView site={{schemaVersion:2,slug:'sample',siteName:'Harbor Swim Club',layout,theme:{primary:'#164e63',secondary:'#ffffff',accent:'#000000',surface},logoPath:null,settings:{typography:'sans',faviconPath:null,socialImagePath:null,seoTitle:'',seoDescription:''},pages:[{slug:'home',title:'Home',visible:true,navOrder:0,seoDescription:'',sections:[{type:'hero',heading:'Find your lane.',text:'A place to grow, together.'},{type:'richText',heading:'Hidden draft section',text:'PRIVATE',hidden:true},{type:'cards',heading:'More than a swim team',items:[{title:'Community',text:'Everyone belongs.'},{title:'Progress',text:'Practice with purpose.'}]},{type:'image',alt:'Our team pool',path:'00000000-0000-4000-8000-000000000001.webp'},{type:'cta',heading:'Join us',label:'Contact the team',href:'/contact'}]},{slug:'contact',title:'Contact',visible:true,navOrder:1,seoDescription:'',sections:[]},{slug:'hidden',title:'Private draft',visible:false,navOrder:2,seoDescription:'',sections:[]}]}}/>);}`;
  await build({
    stdin: { contents: entry, loader: "tsx", resolveDir: process.cwd() },
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: join(dir, "render.cjs"),
    loader: { ".css": "empty" },
    jsx: "automatic",
  });
  const { render } = (await import(pathToFileURL(join(dir, "render.cjs")).href))
    .default;
  const css = await readFile("src/modules/omnisite/site.css", "utf8");
  const png = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#0e7490" },
  })
    .png()
    .toBuffer();
  server = createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(png);
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const [layout = "classic", surface = "light"] = url.pathname
      .slice(1)
      .split("/");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      `<!doctype html><html lang="en"><head><title>Harbor Swim Club</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${css}</style></head><body>${render(layout, surface)}</body></html>`,
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  let checks = 0;
  for (const layout of ["classic", "bold", "minimal"])
    for (const surface of ["light", "dark"])
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          `http://127.0.0.1:${server.address().port}/${layout}/${surface}`,
        );
        await page.locator(".os-image").waitFor();
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(
          await page.getByText("PRIVATE", { exact: true }).count(),
          0,
        );
        assert.equal(
          await page.getByRole("link", { name: "Private draft" }).count(),
          0,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${layout}/${surface}/${width}: overflow`,
        );
        assert.equal(
          await page
            .getByRole("link", { name: "Contact the team" })
            .getAttribute("href"),
          "/sites/sample/contact",
        );
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(() => document.activeElement?.textContent),
          "Skip to content",
        );
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          `${layout}/${surface}/${width}: accessibility`,
        );
        checks++;
      }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`http://127.0.0.1:${server.address().port}/classic/light`);
  await page.locator(".os-site").evaluate((el) => (el.style.width = "375px"));
  assert.equal(
    await page
      .locator(".os-header")
      .evaluate((el) => getComputedStyle(el).flexDirection),
    "column",
    "container preview follows mobile layout",
  );
  console.log(
    `PASS: ${checks} Chromium layout/theme/viewport combinations, keyboard skip links, navigation, hidden-content exclusion, no horizontal overflow, and axe WCAG A/AA checks. Mobile preview container also passed.`,
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
}
