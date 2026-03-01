import { chromium, type Page } from "playwright";

export interface ScrapedTime {
  eventName: string;
  timeInSeconds: number;
  date: Date;
  meetName: string;
  course: string;
}

export interface ScrapeOptions {
  /** Called after each swim year is scraped with the year label and count */
  onYearScraped?: (year: string, count: number) => void;
  /**
   * Map of swim year value (e.g. "2025") to the count of times already stored
   * in the DB for that year. If a past year's row count matches, skip parsing.
   */
  previousYearCounts?: Map<string, number>;
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
 * Compute the USA Swimming swim year for a given date.
 * Swim years run September 1 – August 31.
 * The year label is the ending calendar year (e.g. Sep 2024–Aug 2025 = "2025").
 */
export function getSwimYear(date: Date): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  if (month >= 8) {
    // September (8) through December (11) → next calendar year
    return String(year + 1);
  }
  // January (0) through August (7) → current calendar year
  return String(year);
}

/**
 * Parse the currently visible times table on the USA Swimming results page.
 */
async function parseTimesTable(page: Page): Promise<ScrapedTime[]> {
  const times: ScrapedTime[] = [];

  const table = page.locator("table").first();
  const headerCount = await table.locator("thead tr").count();
  if (headerCount === 0) return times;

  const headerRow = table.locator("thead tr").first();
  const headers = await headerRow.locator("th").allTextContents();
  const cleanHeaders = headers.map((h) => h.trim().toLowerCase());

  const eventIdx = cleanHeaders.findIndex((h) => h.includes("event"));
  const timeIdx = cleanHeaders.findIndex((h) => h.includes("swim time"));
  const meetIdx = cleanHeaders.findIndex((h) => h.includes("meet"));
  const dateIdx = cleanHeaders.findIndex((h) => h.includes("swim date"));

  if (eventIdx < 0 || timeIdx < 0) return times;

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

/**
 * Get all available swim year options from the competition year dropdown.
 * Returns values like [{ value: "2026", text: "2026 (9/1/2025-8/31/2026)" }, ...]
 * ordered from most recent to oldest.
 */
async function getAvailableSwimYears(
  page: Page
): Promise<{ value: string; text: string }[]> {
  const select = page.locator("#competitionYearId");
  if ((await select.count()) === 0) return [];

  const options = await select.locator("option").all();
  const years: { value: string; text: string }[] = [];
  for (const opt of options) {
    const value = (await opt.getAttribute("value")) || "";
    const text = ((await opt.textContent()) || "").trim();
    // Skip placeholder options like "Select" and "--"
    if (value && text && !text.startsWith("Select") && text !== "--") {
      years.push({ value, text });
    }
  }
  return years;
}

/**
 * Switch the competition year dropdown and wait for the table to reload.
 */
async function selectSwimYear(page: Page, yearValue: string): Promise<void> {
  await page.locator("#competitionYearId").selectOption(yearValue);
  await page.waitForTimeout(4000);
}

/**
 * Scrape all times for a swimmer from USA Swimming's data hub.
 * Launches its own browser — convenient for one-off usage.
 */
export async function scrapeSwimmerTimes(
  firstName: string,
  lastName: string,
  clubMatch?: string,
  options?: ScrapeOptions
): Promise<ScrapedTime[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    return await scrapeWithPage(page, firstName, lastName, clubMatch, options);
  } finally {
    await browser.close();
  }
}

/**
 * Scrape all times using an existing Playwright page — useful for batching
 * multiple swimmers without reopening the browser.
 *
 * Iterates through ALL available swim years, accumulating times from each.
 */
export async function scrapeWithPage(
  page: Page,
  firstName: string,
  lastName: string,
  clubMatch?: string,
  options?: ScrapeOptions
): Promise<ScrapedTime[]> {
  const allTimes: ScrapedTime[] = [];

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
    return allTimes;
  }

  // Wait for the results page and times table to load
  await page.waitForTimeout(5000);

  // Discover all available swim years
  const availableYears = await getAvailableSwimYears(page);

  if (availableYears.length === 0) {
    // Fallback: just parse the default table (single year)
    console.log("  No year selector found, scraping default view only");
    const times = await parseTimesTable(page);
    allTimes.push(...times);
    options?.onYearScraped?.("current", times.length);
    return allTimes;
  }

  // Determine the currently selected year (first option is typically the default)
  const currentYearValue = await page
    .locator("#competitionYearId")
    .inputValue();

  // Iterate through all available swim years
  for (const year of availableYears) {
    try {
      // If this isn't the currently loaded year, switch to it
      if (year.value !== currentYearValue) {
        await selectSwimYear(page, year.value);
      }

      // Optimization: for past years, check if row count matches DB count
      if (options?.previousYearCounts?.has(year.value)) {
        const knownCount = options.previousYearCounts.get(year.value)!;
        const rowCount = await page.locator("table tbody tr").count();
        if (rowCount === knownCount && knownCount > 0) {
          console.log(
            `  [${year.value}] Unchanged (${rowCount} times), skipping`
          );
          options?.onYearScraped?.(year.value, rowCount);
          continue;
        }
      }

      // Parse the times table for this year
      const yearTimes = await parseTimesTable(page);
      allTimes.push(...yearTimes);

      console.log(`  [${year.value}] ${yearTimes.length} times`);
      options?.onYearScraped?.(year.value, yearTimes.length);

      // If no rows, stop going further back — swimmer wasn't registered yet
      if (yearTimes.length === 0) {
        console.log(`  [${year.value}] No times found, stopping year search`);
        break;
      }
    } catch (err) {
      console.error(
        `  [${year.value}] Failed to scrape: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  return allTimes;
}
