/*
  Warnings:

  - You are about to drop the column `board` on the `ChessGame` table. All the data in the column will be lost.
  - You are about to alter the column `currentTurn` on the `ChessGame` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `boardState` to the `ChessGame` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChessGame" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "player1Id" INTEGER NOT NULL,
    "player2Id" INTEGER NOT NULL,
    "boardState" TEXT NOT NULL,
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "result" TEXT,
    "moves" TEXT NOT NULL DEFAULT '[]',
    "drawOfferedBy" INTEGER,
    "isVsBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChessGame_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChessGame_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChessGame" ("createdAt", "currentTurn", "id", "player1Id", "player2Id", "result", "status", "updatedAt") SELECT "createdAt", "currentTurn", "id", "player1Id", "player2Id", "result", "status", "updatedAt" FROM "ChessGame";
DROP TABLE "ChessGame";
ALTER TABLE "new_ChessGame" RENAME TO "ChessGame";
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
    "newbieBoostExpiresAt" DATETIME,
    "comboCount" INTEGER NOT NULL DEFAULT 0,
    "lastQuestCompletedAt" DATETIME,
    "laptevMsgCount" INTEGER NOT NULL DEFAULT 0,
    "laptevMsgDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("adWatchesToday", "aiCoachAdvice", "aiCoachUpdatedAt", "avatarFrame", "avatarStyle", "clanId", "clanRole", "comboCount", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "firstQuestBonusDate", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "hiddenClass", "id", "lastActiveAt", "lastActiveQuestDate", "lastAdWatchedAt", "lastChestStreak", "lastGoalBonusDate", "lastGratitudeBonusDate", "lastJournalBonusDate", "lastLoginAt", "lastLoginBonusDate", "lastMasteryQuestDate", "lastPomodoroBonusDate", "lastQuestCompletedAt", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "newbieBoostExpiresAt", "nicknameEffect", "onboardingData", "onboardingDone", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "weeklyXp", "weeklyXpUpdatedAt", "xp", "xpBoostExpiresAt", "xpBoostPermanent") SELECT "adWatchesToday", "aiCoachAdvice", "aiCoachUpdatedAt", "avatarFrame", "avatarStyle", "clanId", "clanRole", "comboCount", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "firstQuestBonusDate", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "hiddenClass", "id", "lastActiveAt", "lastActiveQuestDate", "lastAdWatchedAt", "lastChestStreak", "lastGoalBonusDate", "lastGratitudeBonusDate", "lastJournalBonusDate", "lastLoginAt", "lastLoginBonusDate", "lastMasteryQuestDate", "lastPomodoroBonusDate", "lastQuestCompletedAt", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "newbieBoostExpiresAt", "nicknameEffect", "onboardingData", "onboardingDone", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "weeklyXp", "weeklyXpUpdatedAt", "xp", "xpBoostExpiresAt", "xpBoostPermanent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
