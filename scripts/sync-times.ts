import { PrismaClient } from "@prisma/client";
import { scrapeSwimmerTimes, type ScrapedTime } from "./scraper";

const prisma = new PrismaClient();

async function upsertTimes(swimmerId: number, times: ScrapedTime[]) {
  let added = 0;
  let updated = 0;

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

      if (existing) {
        if (existing.timeInSeconds !== t.timeInSeconds) {
          await prisma.swimTime.update({
            where: { id: existing.id },
            data: { timeInSeconds: t.timeInSeconds, course: t.course },
          });
          updated++;
        }
      } else {
        await prisma.swimTime.create({
          data: {
            swimmerId,
            eventName: t.eventName,
            timeInSeconds: t.timeInSeconds,
            date: t.date,
            meetName: t.meetName,
            course: t.course,
          },
        });
        added++;
      }
    } catch (error) {
      console.error(
        `  Error upserting time for event ${t.eventName}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { added, updated };
}

async function syncExistingSwimmers() {
  console.log("=== Syncing existing swimmers ===");
  const swimmers = await prisma.swimmer.findMany();

  for (const swimmer of swimmers) {
    console.log(`\nSyncing ${swimmer.firstName} ${swimmer.lastName}...`);
    try {
      const times = await scrapeSwimmerTimes(
        swimmer.firstName,
        swimmer.lastName
      );
      if (times.length > 0) {
        const result = await upsertTimes(swimmer.id, times);
        console.log(
          `  Done: ${result.added} added, ${result.updated} updated`
        );
      } else {
        console.log(`  No times found (scraper may need USA Swimming site access)`);
      }
    } catch (error) {
      console.error(
        `  Failed to sync ${swimmer.firstName} ${swimmer.lastName}:`,
        error instanceof Error ? error.message : error
      );
    }
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

  for (const req of pendingRequests) {
    console.log(`\nProcessing request: ${req.firstName} ${req.lastName}...`);
    try {
      const times = await scrapeSwimmerTimes(req.firstName, req.lastName);

      if (times.length > 0) {
        // Create or find the swimmer
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
          console.log(`  Created swimmer: ${swimmer.firstName} ${swimmer.lastName}`);
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
        console.log(`  No times found for ${req.firstName} ${req.lastName}`);
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
}

async function main() {
  console.log(`\n🏊 Green Machines Time Sync`);
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
