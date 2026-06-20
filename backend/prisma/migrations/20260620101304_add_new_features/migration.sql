-- AlterTable
ALTER TABLE "Task" ADD COLUMN "completedAt" DATETIME;

-- CreateTable
CREATE TABLE "Pet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Питомец',
    "mood" INTEGER NOT NULL DEFAULT 50,
    "lastFed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "nameSet" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'Новичок',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "streakFreezeCount" INTEGER NOT NULL DEFAULT 0,
    "streakUpdatedDate" DATETIME,
    "customQuestsCreatedToday" INTEGER NOT NULL DEFAULT 0,
    "customQuestsResetDate" DATETIME,
    "masteryPath" TEXT,
    "masteryNodeIndex" INTEGER NOT NULL DEFAULT 0,
    "masteryChoices" TEXT,
    "masteryStatusChangesLeft" INTEGER NOT NULL DEFAULT 1,
    "hasEverFinishedMastery" BOOLEAN NOT NULL DEFAULT false,
    "lastMasteryQuestDate" DATETIME,
    "xpBoostExpiresAt" DATETIME,
    "goldBoostExpiresAt" DATETIME,
    "xpBoostPermanent" BOOLEAN NOT NULL DEFAULT false,
    "goldBoostPermanent" BOOLEAN NOT NULL DEFAULT false,
    "lastTaskDate" DATETIME,
    "lastLoginBonusDate" DATETIME,
    "lastActiveAt" DATETIME,
    "clanId" INTEGER,
    "clanRole" TEXT,
    "lastChestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "id", "lastActiveAt", "lastChestStreak", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "xp", "xpBoostExpiresAt", "xpBoostPermanent") SELECT "clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "id", "lastActiveAt", "lastChestStreak", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "xp", "xpBoostExpiresAt", "xpBoostPermanent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Pet_userId_key" ON "Pet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_type_key" ON "Achievement"("userId", "type");
