import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create swimmers
  const mady = await prisma.swimmer.upsert({
    where: { firstName_lastName: { firstName: "Mady", lastName: "Swimmer" } },
    update: {},
    create: {
      firstName: "Mady",
      lastName: "Swimmer",
      usaSwimmingId: null,
    },
  });

  const lilly = await prisma.swimmer.upsert({
    where: { firstName_lastName: { firstName: "Lilly", lastName: "Swimmer" } },
    update: {},
    create: {
      firstName: "Lilly",
      lastName: "Swimmer",
      usaSwimmingId: null,
    },
  });

  // Mady's times - age group competitive swimmer
  const madyTimes = [
    // 50 Free SCY progression
    { eventName: "50 Free SCY", timeInSeconds: 32.45, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 31.89, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 31.22, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 30.78, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 30.15, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 29.87, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Free SCY progression
    { eventName: "100 Free SCY", timeInSeconds: 71.34, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 69.88, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 68.45, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 67.23, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 66.11, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 65.45, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Back SCY
    { eventName: "50 Back SCY", timeInSeconds: 37.89, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 36.54, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 35.67, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 34.98, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Back SCY
    { eventName: "100 Back SCY", timeInSeconds: 78.45, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "100 Back SCY", timeInSeconds: 76.23, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "100 Back SCY", timeInSeconds: 74.89, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Fly SCY
    { eventName: "50 Fly SCY", timeInSeconds: 35.12, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "50 Fly SCY", timeInSeconds: 33.89, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "50 Fly SCY", timeInSeconds: 33.01, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Fly SCY
    { eventName: "100 Fly SCY", timeInSeconds: 78.67, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "100 Fly SCY", timeInSeconds: 76.34, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "100 Fly SCY", timeInSeconds: 74.56, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 200 IM SCY
    { eventName: "200 IM SCY", timeInSeconds: 155.67, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "200 IM SCY", timeInSeconds: 151.23, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "200 IM SCY", timeInSeconds: 148.45, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Breast SCY
    { eventName: "50 Breast SCY", timeInSeconds: 41.23, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Breast SCY", timeInSeconds: 39.87, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Breast SCY", timeInSeconds: 38.56, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
  ];

  // Lilly's times - slightly younger/different events
  const lillyTimes = [
    // 50 Free SCY progression
    { eventName: "50 Free SCY", timeInSeconds: 35.67, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 34.89, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 34.12, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 33.45, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 32.78, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Free SCY", timeInSeconds: 32.11, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Free SCY
    { eventName: "100 Free SCY", timeInSeconds: 76.89, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 75.23, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 73.56, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 72.11, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 71.34, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "100 Free SCY", timeInSeconds: 70.23, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Back SCY
    { eventName: "50 Back SCY", timeInSeconds: 40.12, date: "2025-03-15", meetName: "Spring Invitational", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 38.89, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 37.45, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Back SCY", timeInSeconds: 36.78, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Back SCY
    { eventName: "100 Back SCY", timeInSeconds: 82.34, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "100 Back SCY", timeInSeconds: 80.12, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "100 Back SCY", timeInSeconds: 78.56, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Breast SCY
    { eventName: "50 Breast SCY", timeInSeconds: 43.56, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "50 Breast SCY", timeInSeconds: 42.11, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "50 Breast SCY", timeInSeconds: 41.23, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 100 Breast SCY
    { eventName: "100 Breast SCY", timeInSeconds: 92.34, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "100 Breast SCY", timeInSeconds: 89.78, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "100 Breast SCY", timeInSeconds: 87.45, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 50 Fly SCY
    { eventName: "50 Fly SCY", timeInSeconds: 38.45, date: "2025-07-20", meetName: "Summer Championships", course: "SCY" },
    { eventName: "50 Fly SCY", timeInSeconds: 37.12, date: "2025-11-09", meetName: "November Invitational", course: "SCY" },
    { eventName: "50 Fly SCY", timeInSeconds: 36.34, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
    // 200 IM SCY
    { eventName: "200 IM SCY", timeInSeconds: 168.45, date: "2025-05-10", meetName: "May Classic", course: "SCY" },
    { eventName: "200 IM SCY", timeInSeconds: 163.23, date: "2025-09-14", meetName: "Fall Kickoff", course: "SCY" },
    { eventName: "200 IM SCY", timeInSeconds: 159.87, date: "2026-01-18", meetName: "New Year Meet", course: "SCY" },
  ];

  for (const t of madyTimes) {
    await prisma.swimTime.upsert({
      where: {
        swimmerId_eventName_date_meetName: {
          swimmerId: mady.id,
          eventName: t.eventName,
          date: new Date(t.date),
          meetName: t.meetName,
        },
      },
      update: { timeInSeconds: t.timeInSeconds, course: t.course },
      create: {
        swimmerId: mady.id,
        eventName: t.eventName,
        timeInSeconds: t.timeInSeconds,
        date: new Date(t.date),
        meetName: t.meetName,
        course: t.course,
      },
    });
  }

  for (const t of lillyTimes) {
    await prisma.swimTime.upsert({
      where: {
        swimmerId_eventName_date_meetName: {
          swimmerId: lilly.id,
          eventName: t.eventName,
          date: new Date(t.date),
          meetName: t.meetName,
        },
      },
      update: { timeInSeconds: t.timeInSeconds, course: t.course },
      create: {
        swimmerId: lilly.id,
        eventName: t.eventName,
        timeInSeconds: t.timeInSeconds,
        date: new Date(t.date),
        meetName: t.meetName,
        course: t.course,
      },
    });
  }

  console.log("Seeded swimmers and times successfully!");
  console.log(`Mady: ${madyTimes.length} times`);
  console.log(`Lilly: ${lillyTimes.length} times`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
