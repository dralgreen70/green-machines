import { chromium, type Page } from "playwright";

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
    const [mins, secs] = cleaned.split(":");
    return parseInt(mins) * 60 + parseFloat(secs);
  }
  return parseFloat(cleaned);
}

function normalizeCourse(course: string): string {
  const c = course.toUpperCase().trim();
  if (c.includes("SCY") || c.includes("SHORT COURSE YARDS")) return "SCY";
  if (c.includes("SCM") || c.includes("SHORT COURSE METERS")) return "SCM";
  if (c.includes("LCM") || c.includes("LONG COURSE METERS")) return "LCM";
  return c;
}

export async function scrapeSwimmerTimes(
  firstName: string,
  lastName: string
): Promise<ScrapedTime[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const times: ScrapedTime[] = [];

  try {
    console.log(`  Navigating to USA Swimming individual times search...`);
    await page.goto(
      "https://www.usaswimming.org/times/individual-times-search",
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // Fill in name fields
    await fillSearchForm(page, firstName, lastName);

    // Wait for results to load
    console.log(`  Waiting for results...`);
    await page.waitForTimeout(5000);

    // Try to find results table
    const hasResults = await page
      .locator("table, .times-result, .result-row, [class*='result']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasResults) {
      console.log(`  No results table found for ${firstName} ${lastName}`);
      return times;
    }

    // Parse results - adapt selectors to actual page structure
    const rows = await page
      .locator("table tbody tr, .result-row, [class*='time-row']")
      .all();

    console.log(`  Found ${rows.length} result rows`);

    for (const row of rows) {
      try {
        const cells = await row.locator("td").all();
        if (cells.length < 4) continue;

        const cellTexts = await Promise.all(
          cells.map((c) => c.textContent().then((t) => t?.trim() || ""))
        );

        // Try to extract event name, time, date, meet name, course
        // Actual column order depends on the site's current layout
        const eventName = cellTexts[0] || "";
        const timeStr = cellTexts[1] || "";
        const dateStr = cellTexts[2] || "";
        const meetName = cellTexts[3] || "";
        const course = cellTexts[4] || "SCY";

        if (!eventName || !timeStr) continue;

        const timeInSeconds = parseTimeString(timeStr);
        if (isNaN(timeInSeconds) || timeInSeconds <= 0) continue;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const normalizedCourse = normalizeCourse(course);
        const fullEventName = `${eventName} ${normalizedCourse}`;

        times.push({
          eventName: fullEventName,
          timeInSeconds,
          date,
          meetName: meetName || "Unknown Meet",
          course: normalizedCourse,
        });
      } catch {
        // Skip rows that don't parse correctly
        continue;
      }
    }

    console.log(`  Parsed ${times.length} times for ${firstName} ${lastName}`);
  } catch (error) {
    console.error(
      `  Error scraping times for ${firstName} ${lastName}:`,
      error instanceof Error ? error.message : error
    );
  } finally {
    await browser.close();
  }

  return times;
}

async function fillSearchForm(
  page: Page,
  firstName: string,
  lastName: string
) {
  // Try common form field selectors
  const firstNameSelectors = [
    'input[name="firstName"]',
    'input[name="first_name"]',
    'input[placeholder*="First"]',
    'input[id*="first"]',
    "#firstName",
  ];
  const lastNameSelectors = [
    'input[name="lastName"]',
    'input[name="last_name"]',
    'input[placeholder*="Last"]',
    'input[id*="last"]',
    "#lastName",
  ];

  for (const sel of firstNameSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill(firstName);
      console.log(`  Filled first name using selector: ${sel}`);
      break;
    }
  }

  for (const sel of lastNameSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill(lastName);
      console.log(`  Filled last name using selector: ${sel}`);
      break;
    }
  }

  // Try to click search button
  const searchSelectors = [
    'button[type="submit"]',
    'button:has-text("Search")',
    'input[type="submit"]',
    'button:has-text("Find")',
    ".search-button",
  ];

  for (const sel of searchSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click();
      console.log(`  Clicked search using selector: ${sel}`);
      break;
    }
  }
}
