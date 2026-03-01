-- CreateTable
CREATE TABLE "SwimSplit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "swimTimeId" INTEGER NOT NULL,
    "distance" INTEGER NOT NULL,
    "splitTime" REAL NOT NULL,
    "cumulativeSplitTime" REAL NOT NULL,
    CONSTRAINT "SwimSplit_swimTimeId_fkey" FOREIGN KEY ("swimTimeId") REFERENCES "SwimTime" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SwimSplit_swimTimeId_idx" ON "SwimSplit"("swimTimeId");
