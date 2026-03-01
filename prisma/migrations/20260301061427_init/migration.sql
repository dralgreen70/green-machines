-- CreateTable
CREATE TABLE "Swimmer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "usaSwimmingId" TEXT
);

-- CreateTable
CREATE TABLE "SwimTime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "swimmerId" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "timeInSeconds" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "meetName" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    CONSTRAINT "SwimTime_swimmerId_fkey" FOREIGN KEY ("swimmerId") REFERENCES "Swimmer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SwimmerRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "usaSwimmingId" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending'
);

-- CreateIndex
CREATE UNIQUE INDEX "Swimmer_firstName_lastName_key" ON "Swimmer"("firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "SwimTime_swimmerId_eventName_date_meetName_key" ON "SwimTime"("swimmerId", "eventName", "date", "meetName");
