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
    "avatarStyle" TEXT NOT NULL DEFAULT 'default',
    "avatarFrame" TEXT NOT NULL DEFAULT 'none',
    "nicknameEffect" TEXT NOT NULL DEFAULT 'none',
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
    "lastLoginAt" DATETIME,
    "lastActiveQuestDate" DATETIME,
    "weeklyXp" INTEGER NOT NULL DEFAULT 0,
    "weeklyXpUpdatedAt" DATETIME,
    "clanId" INTEGER,
    "clanRole" TEXT,
    "lastChestStreak" INTEGER NOT NULL DEFAULT 0,
    "dailyGiftSentAt" DATETIME,
    "dailyGiftSentTo" INTEGER,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "onboardingData" TEXT,
    "hiddenClass" TEXT,
    "aiCoachAdvice" TEXT,
    "aiCoachUpdatedAt" DATETIME,
    "lastJournalBonusDate" DATETIME,
    "lastGratitudeBonusDate" DATETIME,
    "lastPomodoroBonusDate" DATETIME,
    "lastGoalBonusDate" DATETIME,
    "firstQuestBonusDate" DATETIME,
    "lastAdWatchedAt" DATETIME,
    "adWatchesToday" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("aiCoachAdvice", "aiCoachUpdatedAt", "avatarFrame", "avatarStyle", "clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "hiddenClass", "id", "lastActiveAt", "lastActiveQuestDate", "lastChestStreak", "lastLoginAt", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "nicknameEffect", "onboardingData", "onboardingDone", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "weeklyXp", "weeklyXpUpdatedAt", "xp", "xpBoostExpiresAt", "xpBoostPermanent") SELECT "aiCoachAdvice", "aiCoachUpdatedAt", "avatarFrame", "avatarStyle", "clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "hiddenClass", "id", "lastActiveAt", "lastActiveQuestDate", "lastChestStreak", "lastLoginAt", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "nicknameEffect", "onboardingData", "onboardingDone", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "weeklyXp", "weeklyXpUpdatedAt", "xp", "xpBoostExpiresAt", "xpBoostPermanent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
