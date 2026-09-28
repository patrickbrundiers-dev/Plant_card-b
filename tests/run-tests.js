// Test runner for the Plant Sensor Card / Plant Overview Card.
//
// Each *.html file in this directory is a self-contained Playwright test:
// it loads the card scripts with small stub HA frontend elements
// (ha-textfield, ha-switch, ha-entity-picker, mwc-button), exercises the
// card/editor, and sets `window.__testResult = { ok: boolean, failures: [...] }`.
//
// This script opens every test file in headless Chromium, waits for
// __testResult, and reports pass/fail. Exits with a non-zero code if any
// test fails or times out, so it can be used as a CI gate.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const TESTS_DIR = __dirname;
const TIMEOUT_MS = 15000;

async function runOne(browser, file) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  // Some tests exercise a prompt() fallback path; never let it hang headless.
  page.on("dialog", (d) => d.dismiss());

  const fileUrl = "file://" + path.join(TESTS_DIR, file);
  try {
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__testResult !== undefined, { timeout: TIMEOUT_MS });
    const result = await page.evaluate(() => window.__testResult);
    await page.close();
    return { file, ...result, consoleErrors };
  } catch (e) {
    await page.close();
    return { file, ok: false, failures: [`timed out or crashed: ${e.message}`], consoleErrors };
  }
}

async function main() {
  const files = fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith(".html"))
    .sort();

  if (files.length === 0) {
    console.error("No *.html test files found in " + TESTS_DIR);
    process.exit(1);
  }

  const browser = await chromium.launch();
  let allOk = true;

  for (const file of files) {
    const result = await runOne(browser, file);
    if (result.ok) {
      console.log(`PASS  ${file}`);
    } else {
      allOk = false;
      console.log(`FAIL  ${file}`);
      (result.failures || []).forEach((f) => console.log(`      - ${f}`));
      if (result.consoleErrors && result.consoleErrors.length) {
        result.consoleErrors.forEach((e) => console.log(`      ! console error: ${e}`));
      }
    }
  }

  await browser.close();

  if (!allOk) {
    console.log("\nSome tests failed.");
    process.exit(1);
  }
  console.log("\nAll tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
