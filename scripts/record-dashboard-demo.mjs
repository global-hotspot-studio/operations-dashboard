import playwright from "/Users/sunmojuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.js";
import fs from "node:fs";
import path from "node:path";

const { chromium } = playwright;

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "assets", "demo-video");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader"]
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } },
  locale: "zh-CN"
});
const page = await context.newPage();
await page.goto("https://global-hotspot-studio.github.io/operations-dashboard/?demo=leadership", { waitUntil: "networkidle" });
await page.addStyleTag({ content: `
  #demoCursor { position: fixed; z-index: 2147483647; width: 22px; height: 22px; border-radius: 50%;
    background: #1677ff; border: 4px solid rgba(255,255,255,.94); box-shadow: 0 3px 12px rgba(10,55,115,.34);
    pointer-events: none; transform: translate(-50%, -50%); transition: left .35s ease, top .35s ease, transform .16s ease; }
  #demoCursor.is-clicking { transform: translate(-50%, -50%) scale(.72); }
` });
await page.evaluate(() => {
  const cursor = document.createElement("div");
  cursor.id = "demoCursor";
  cursor.style.left = "88%";
  cursor.style.top = "12%";
  document.body.appendChild(cursor);
});

async function demoClick(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Target not visible for demo click");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector("#demoCursor");
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }, { x, y });
  await page.waitForTimeout(650);
  await page.evaluate(() => document.querySelector("#demoCursor").classList.add("is-clicking"));
  await locator.click();
  await page.waitForTimeout(180);
  await page.evaluate(() => document.querySelector("#demoCursor").classList.remove("is-clicking"));
}

await page.waitForTimeout(3600);

// 1. 从总览进入热点池，并演示地区筛选。
await demoClick(page.locator('.nav-item[data-view="pool"]'));
await page.waitForTimeout(1800);
await demoClick(page.locator("#regionFilter"));
await page.locator("#regionFilter").selectOption({ label: "印度" });
await page.waitForTimeout(2200);

// 2. 打开一个真实热点详情，再回到列表。
await demoClick(page.locator("#hotspotRows tr").first());
await page.waitForTimeout(2500);
await demoClick(page.locator("#closeDrawer"));
await page.waitForTimeout(1200);

// 3. 从左侧菜单精确跳转至运营候选 / 样图模块，演示提示词和下载能力。
await demoClick(page.locator('.nav-item[data-view="candidates"]'));
await page.waitForTimeout(2500);
const copyButton = page.locator(".copy-prompt").first();
await copyButton.scrollIntoViewIfNeeded();
await demoClick(copyButton);
await page.waitForTimeout(1800);
const download = page.locator("a[download]").first();
const downloadBox = await download.boundingBox();
await page.evaluate(({ x, y }) => {
  const cursor = document.querySelector("#demoCursor");
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
}, { x: downloadBox.x + downloadBox.width / 2, y: downloadBox.y + downloadBox.height / 2 });
await download.hover();
await page.waitForTimeout(1800);

// 4. 最后展示左侧菜单可直达配置中心，收束为完整工作流。
await demoClick(page.locator('.nav-item[data-view="config"]'));
await page.waitForTimeout(2600);

const video = page.video();
await page.close();
await context.close();
const recordedPath = await video.path();
const finalPath = path.join(outputDir, "trendos-dashboard-demo.webm");
fs.renameSync(recordedPath, finalPath);
await browser.close();
console.log(finalPath);
