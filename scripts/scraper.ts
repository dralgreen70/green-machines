import { chromium, type Page, type Browser } from "playwright";

export interface ScrapedTime {
  eventName: string;
  timeInSeconds: number;
  date: Date;
  meetName: string;
  course: string;
}

function parseTimeString(timeStr: string): number {
  const cleaned = timeStr.trim();
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
  }
  const val = parseFloat(cleaned);
  return isNaN(val) ? -1 : val;
}

/**
 * Scrape all times for a swimmer from USA Swimming's data hub.
 *
 * @param firstName - First/preferred name to search (e.g. "Mady")
 * @param lastName  - Last name to search (e.g. "Green")
 * @param clubMatch - Substring to match in the results table to identify the
 *                    correct swimmer (e.g. "Rockwall"). If empty, picks the first result.
 */
export async function scrapeSwimmerTimes(
  firstName: string,
  lastName: string,
  clubMatch?: string
): Promise<ScrapedTime[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    return await scrapeWithPage(page, firstName, lastName, clubMatch);
  } finally {
    await browser.close();
  }
}

/**
 * Scrape times using an existing page — useful for batching multiple swimmers
 * without reopening the browser.
 */
export async function scrapeWithPage(
  page: Page,
  firstName: string,
  lastName: string,
  clubMatch?: string
): Promise<ScrapedTime[]> {
  const times: ScrapedTime[] = [];

  // Navigate to USA Swimming individual search
  await page.goto(
    "https://data.usaswimming.org/datahub/usas/individualsearch",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await page.waitForTimeout(2000);

  // Fill in the search form
  await page.locator("#firstOrPreferredName").fill(firstName);
  await page.locator("#lastName").fill(lastName);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  // Find the correct swimmer row by club name
  const rows = await page.locator("table tr").all();
  let clicked = false;

  for (const row of rows) {
    const text = await row.textContent().catch(() => "");
    if (!text) continue;

    // If clubMatch is provided, use it to identify the right swimmer
    if (clubMatch && !text.includes(clubMatch)) continue;

    const btn = row.locator("button, a").filter({ hasText: /see results/i });
    if ((await btn.count()) > 0) {
      await btn.first().click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.log(
      `  Could not find swimmer ${firstName} ${lastName}` +
        (clubMatch ? ` matching club "${clubMatch}"` : "")
    );
    return times;
  }

  // Wait for the times table to load
  await page.waitForTimeout(5000);

  // Parse the times table
  const table = page.locator("table").first();
  const headerRow = await table.locator("thead tr").first();
  const headers = await headerRow.locator("th").allTextContents();
  const cleanHeaders = headers.map((h) => h.trim().toLowerCase());

  const eventIdx = cleanHeaders.findIndex((h) => h.includes("event"));
  const timeIdx = cleanHeaders.findIndex((h) => h.includes("swim time"));
  const meetIdx = cleanHeaders.findIndex((h) => h.includes("meet"));
  const dateIdx = cleanHeaders.findIndex((h) => h.includes("swim date"));

  if (eventIdx < 0 || timeIdx < 0) {
    console.log("  Could not identify table columns");
    return times;
  }

  const bodyRows = await table.locator("tbody tr").all();
  for (const row of bodyRows) {
    const cells = await row.locator("td").allTextContents();
    const clean = cells.map((c) => c.trim());

    const eventRaw = clean[eventIdx] || "";
    const timeStr = clean[timeIdx] || "";
    const meetName = meetIdx >= 0 ? clean[meetIdx] || "" : "";
    const dateStr = dateIdx >= 0 ? clean[dateIdx] || "" : "";

    if (!eventRaw || !timeStr) continue;

    const timeInSeconds = parseTimeString(timeStr);
    if (timeInSeconds <= 0) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    // Detect course from the event name (e.g. "50 FR SCY", "100 FR LCM")
    let course = "SCY";
    if (eventRaw.includes("LCM")) course = "LCM";
    else if (eventRaw.includes("SCM")) course = "SCM";

    times.push({
      eventName: eventRaw,
      timeInSeconds,
      date,
      meetName,
      course,
    });
  }

  return times;
}
