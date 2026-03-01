import { chromium, type Page } from "playwright";

export interface ScrapedSplit {
  distance: number;
  splitTime: number;           // individual 50 split in seconds
  cumulativeSplitTime: number; // running total in seconds
}

export interface ScrapedTime {
  eventName: string;
  timeInSeconds: number;
  date: Date;
  meetName: string;
  course: string;
  splits: ScrapedSplit[];
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
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 8) return String(year + 1);
  return String(year);
}

/**
 * Click a time link in a row, parse the splits modal, close it, return splits.
 * Returns empty array if splits aren't available.
 */
async function scrapeSplitsForRow(
  page: Page,
  row: ReturnType<Page["locator"]>
): Promise<ScrapedSplit[]> {
  const splits: ScrapedSplit[] = [];

  try {
    // Click the time link (<a> in the second cell) to open the splits modal
    const timeLink = row.locator("td").nth(1).locator("a").first();
    if ((await timeLink.count()) === 0) return splits;

    await timeLink.click();
    // Wait for the modal dialog to appear
    await page
      .locator('[role="dialog"]')
      .waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);

    // Find the splits table inside the modal (it's the second or third table)
    const dialog = page.locator('[role="dialog"]');
    const splitsTable = dialog.locator("table").first();
    if ((await splitsTable.count()) === 0) {
      await closeModal(page);
      return splits;
    }

    const bodyRows = await splitsTable.locator("tbody tr").all();
    for (const splitRow of bodyRows) {
      const cells = await splitRow.locator("td").allTextContents();
      if (cells.length < 3) continue;

      const distance = parseInt(cells[0]?.trim());
      // "Split Time" column = cumulative time at this distance
      const cumulativeStr = cells[1]?.trim();
      // "Cumulative Split Time" column = individual 50 split
      const individualStr = cells[2]?.trim();

      if (isNaN(distance)) continue;

      const cumulativeSplitTime = parseTimeString(cumulativeStr);
      const splitTime = parseTimeString(individualStr);

      if (cumulativeSplitTime <= 0 || splitTime <= 0) continue;

      splits.push({ distance, splitTime, cumulativeSplitTime });
    }
  } catch {
    // Splits not available for this swim — that's fine
  }

  // Always try to close the modal
  await closeModal(page);
  return splits;
}

async function closeModal(page: Page): Promise<void> {
  try {
    const closeBtn = page
      .locator('[role="dialog"]')
      .locator('button:has-text("Close"), button:has-text("Cancel")')
      .first();
    if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible())) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // Try pressing Escape as fallback
    try {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch {
      // ignore
    }
  }
}

/**
 * Parse the currently visible times table on the USA Swimming results page.
 * Also clicks into each row to scrape splits from the modal popup.
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

  // First pass: collect row data and check which are 50-yard events (no splits)
  const bodyRows = await table.locator("tbody tr").all();
  const rowData: {
    eventRaw: string;
    timeStr: string;
    meetName: string;
    dateStr: string;
    rowIndex: number;
  }[] = [];

  for (let i = 0; i < bodyRows.length; i++) {
    const cells = await bodyRows[i].locator("td").allTextContents();
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

    rowData.push({ eventRaw, timeStr, meetName, dateStr, rowIndex: i });
  }

  // Second pass: for each row, scrape splits (re-locate rows each time since
  // the DOM may shift after modal open/close)
  for (const rd of rowData) {
    const timeInSeconds = parseTimeString(rd.timeStr);
    const date = new Date(rd.dateStr);

    let course = "SCY";
    if (rd.eventRaw.includes("LCM")) course = "LCM";
    else if (rd.eventRaw.includes("SCM")) course = "SCM";

    // Check if this event is longer than 50 yards (splits available)
    const is50 = rd.eventRaw.match(/^50\s/);
    let splits: ScrapedSplit[] = [];

    if (!is50) {
      // Re-locate the row fresh (DOM may have changed after modal interactions)
      const freshRow = table.locator("tbody tr").nth(rd.rowIndex);
      splits = await scrapeSplitsForRow(page, freshRow);
    }

    times.push({
      eventName: rd.eventRaw,
      timeInSeconds,
      date,
      meetName: rd.meetName,
      course,
      splits,
    });
  }

  return times;
}

/**
 * Get all available swim year options from the competition year dropdown.
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

  await page.goto(
    "https://data.usaswimming.org/datahub/usas/individualsearch",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await page.waitForTimeout(2000);

  await page.locator("#firstOrPreferredName").fill(firstName);
  await page.locator("#lastName").fill(lastName);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

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

  await page.waitForTimeout(5000);

  const availableYears = await getAvailableSwimYears(page);

  if (availableYears.length === 0) {
    console.log("  No year selector found, scraping default view only");
    const times = await parseTimesTable(page);
    allTimes.push(...times);
    options?.onYearScraped?.("current", times.length);
    return allTimes;
  }

  const currentYearValue = await page
    .locator("#competitionYearId")
    .inputValue();

  for (const year of availableYears) {
    try {
      if (year.value !== currentYearValue) {
        await selectSwimYear(page, year.value);
      }

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

      const yearTimes = await parseTimesTable(page);
      allTimes.push(...yearTimes);

      const splitsCount = yearTimes.filter((t) => t.splits.length > 0).length;
      console.log(
        `  [${year.value}] ${yearTimes.length} times (${splitsCount} with splits)`
      );
      options?.onYearScraped?.(year.value, yearTimes.length);

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
