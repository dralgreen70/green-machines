import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import {
  scrapeWithPage,
  getSwimYear,
  type ScrapedTime,
  type ScrapeOptions,
} from "./scraper";

const prisma = new PrismaClient();

async function upsertTimes(swimmerId: number, times: ScrapedTime[]) {
  let added = 0;
  let updated = 0;
  let splitsStored = 0;

  for (const t of times) {
    try {
      const existing = await prisma.swimTime.findUnique({
        where: {
          swimmerId_eventName_date_meetName: {
            swimmerId,
            eventName: t.eventName,
            date: t.date,
            meetName: t.meetName,
          },
        },
      });

      let swimTimeId: number;

      if (existing) {
        swimTimeId = existing.id;
        if (existing.timeInSeconds !== t.timeInSeconds) {
          await prisma.swimTime.update({
            where: { id: existing.id },
            data: { timeInSeconds: t.timeInSeconds, course: t.course },
          });
          updated++;
        }
      } else {
        const created = await prisma.swimTime.create({
          data: {
            swimmerId,
            eventName: t.eventName,
            timeInSeconds: t.timeInSeconds,
            date: t.date,
            meetName: t.meetName,
            course: t.course,
          },
        });
        swimTimeId = created.id;
        added++;
      }

      // Store splits if available
      if (t.splits && t.splits.length > 0) {
        // Delete old splits and replace with fresh data
        await prisma.swimSplit.deleteMany({ where: { swimTimeId } });
        await prisma.swimSplit.createMany({
          data: t.splits.map((s) => ({
            swimTimeId,
            distance: s.distance,
            splitTime: s.splitTime,
            cumulativeSplitTime: s.cumulativeSplitTime,
          })),
        });
        splitsStored++;
      }
    } catch (error) {
      console.error(
        `  Error upserting time for event ${t.eventName}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { added, updated, splitsStored };
}

/**
 * Build a map of swim year → count of times already in the DB for a swimmer.
 * Used for the "skip unchanged years" optimization.
 * Returns null for a year if any non-50 event is missing splits (forces re-scrape).
 */
async function getExistingYearCounts(
  swimmerId: number
): Promise<Map<string, number>> {
  const existingTimes = await prisma.swimTime.findMany({
    where: { swimmerId },
    select: {
      date: true,
      eventName: true,
      _count: { select: { splits: true } },
    },
  });

  const yearCounts = new Map<string, number>();
  const yearsMissingSplits = new Set<string>();

  for (const t of existingTimes) {
    const year = getSwimYear(t.date);
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);

    // Check if this non-50 event is missing splits
    const is50 = t.eventName.match(/^50\s/);
    if (!is50 && t._count.splits === 0) {
      yearsMissingSplits.add(year);
    }
  }

  // Remove years that are missing splits so the scraper doesn't skip them
  for (const year of yearsMissingSplits) {
    yearCounts.delete(year);
  }

  return yearCounts;
}

async function syncExistingSwimmers() {
  console.log("=== Syncing existing swimmers ===");
  const swimmers = await prisma.swimmer.findMany();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const swimmer of swimmers) {
      console.log(
        `\nSyncing ${swimmer.firstName} ${swimmer.lastName}...`
      );
      try {
        // Build year counts for skip optimization
        const previousYearCounts = await getExistingYearCounts(swimmer.id);

        const scrapeOptions: ScrapeOptions = {
          previousYearCounts,
        };

        const times = await scrapeWithPage(
          page,
          swimmer.firstName,
          swimmer.lastName,
          "Rockwall",
          scrapeOptions
        );

        if (times.length > 0) {
          const result = await upsertTimes(swimmer.id, times);
          console.log(
            `  Total: ${times.length} scraped, ${result.added} added, ${result.updated} updated, ${result.splitsStored} with splits`
          );
        } else {
          console.log(`  No times found`);
        }
      } catch (error) {
        console.error(
          `  Failed to sync ${swimmer.firstName} ${swimmer.lastName}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  } finally {
    await browser.close();
  }
}

async function processPendingRequests() {
  console.log("\n=== Processing pending swimmer requests ===");
  const pendingRequests = await prisma.swimmerRequest.findMany({
    where: { status: "pending" },
  });

  if (pendingRequests.length === 0) {
    console.log("No pending requests.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const req of pendingRequests) {
      console.log(
        `\nProcessing request: ${req.firstName} ${req.lastName}...`
      );
      try {
        const times = await scrapeWithPage(
          page,
          req.firstName,
          req.lastName
        );

        if (times.length > 0) {
          let swimmer = await prisma.swimmer.findFirst({
            where: {
              firstName: req.firstName,
              lastName: req.lastName,
            },
          });

          if (!swimmer) {
            swimmer = await prisma.swimmer.create({
              data: {
                firstName: req.firstName,
                lastName: req.lastName,
                usaSwimmingId: req.usaSwimmingId,
              },
            });
            console.log(
              `  Created swimmer: ${swimmer.firstName} ${swimmer.lastName}`
            );
          }

          const result = await upsertTimes(swimmer.id, times);
          console.log(
            `  Synced: ${result.added} added, ${result.updated} updated`
          );

          await prisma.swimmerRequest.update({
            where: { id: req.id },
            data: { status: "synced" },
          });
          console.log(`  Request status: synced`);
        } else {
          console.log(
            `  No times found for ${req.firstName} ${req.lastName}`
          );
          await prisma.swimmerRequest.update({
            where: { id: req.id },
            data: { status: "failed" },
          });
          console.log(`  Request status: failed`);
        }
      } catch (error) {
        console.error(
          `  Error processing request for ${req.firstName} ${req.lastName}:`,
          error instanceof Error ? error.message : error
        );
        await prisma.swimmerRequest.update({
          where: { id: req.id },
          data: { status: "failed" },
        });
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`\n🏊 The Green Machines Time Sync`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    await syncExistingSwimmers();
    await processPendingRequests();
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n✅ Sync complete: ${new Date().toISOString()}`);
}

main();
