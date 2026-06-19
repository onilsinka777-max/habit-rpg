-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLegendaryQuestAt" DATETIME;

-- CreateTable
CREATE TABLE "LegendaryQuestTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "branch" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
