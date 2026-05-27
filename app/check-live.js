// check-live.js <qa_url> <marker>
// Loads qa_url in headless Chromium, waits for Optimizely to apply changes,
// and checks if `marker` appears in the page HTML.
// Exits 0 if marker found, 1 if not, 2 on error.

const { chromium } = require("playwright");

const [, , url, marker] = process.argv;
if (!url || !marker) {
  console.error("usage: check-live.js <qa_url> <marker>");
  process.exit(2);
}

const cacheBuster = (u) => u + (u.includes("?") ? "&" : "?") + "_cb=" + Date.now();

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      bypassCSP: true,
    });
    const page = await ctx.newPage();
    await page.goto(cacheBuster(url), {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2500);
    const html = await page.content();
    process.exit(html.includes(marker) ? 0 : 1);
  } catch (e) {
    console.error("check-live error:", e.message);
    process.exit(2);
  } finally {
    if (browser) await browser.close();
  }
})();
