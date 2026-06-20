-- AlterTable
ALTER TABLE "QuestTemplate" ADD COLUMN "baseDifficulty" TEXT;
ALTER TABLE "QuestTemplate" ADD COLUMN "baseReps" INTEGER;
ALTER TABLE "QuestTemplate" ADD COLUMN "repScaling" REAL;

-- CreateTable
CREATE TABLE "Marathon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "rewardGold" INTEGER NOT NULL DEFAULT 1000,
    "rewardXp" INTEGER NOT NULL DEFAULT 2000,
    "icon" TEXT NOT NULL DEFAULT '🔥',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MarathonProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "marathonId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "lastCheckIn" DATETIME,
    "failed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MarathonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarathonProgress_marathonId_fkey" FOREIGN KEY ("marathonId") REFERENCES "Marathon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gratitude" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "text1" TEXT NOT NULL,
    "text2" TEXT NOT NULL,
    "text3" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gratitude_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserLeague" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL DEFAULT 'Бронза',
    "weeklyXp" INTEGER NOT NULL DEFAULT 0,
    "weekStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLeague_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Duel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "challengerId" INTEGER NOT NULL,
    "challengedId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "challengerScore" INTEGER NOT NULL DEFAULT 0,
    "challengedScore" INTEGER NOT NULL DEFAULT 0,
    "winnerId" INTEGER,
    "rewardGold" INTEGER NOT NULL DEFAULT 150,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Duel_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedStreak" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user1Id" INTEGER NOT NULL,
    "user2Id" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedStreak_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SharedStreak_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NpcInteraction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "npcId" TEXT NOT NULL,
    "lastInteractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questsGiven" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "NpcInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "requires" TEXT NOT NULL DEFAULT '[]',
    "effect" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL DEFAULT '⚡',
    "goldCost" INTEGER NOT NULL DEFAULT 100,
    "levelRequired" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EasterEgg" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎯',
    "rewardGold" INTEGER NOT NULL DEFAULT 50,
    "rewardXp" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "EasterEggUnlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "eggId" INTEGER NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EasterEggUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EasterEggUnlock_eggId_fkey" FOREIGN KEY ("eggId") REFERENCES "EasterEgg" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarFrame", "avatarStyle", "clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "id", "lastActiveAt", "lastChestStreak", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "nicknameEffect", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "xp", "xpBoostExpiresAt", "xpBoostPermanent") SELECT "avatarFrame", "avatarStyle", "clanId", "clanRole", "createdAt", "customQuestsCreatedToday", "customQuestsResetDate", "dailyGiftSentAt", "dailyGiftSentTo", "email", "gold", "goldBoostExpiresAt", "goldBoostPermanent", "hasEverFinishedMastery", "id", "lastActiveAt", "lastChestStreak", "lastLoginBonusDate", "lastMasteryQuestDate", "lastTaskDate", "level", "masteryChoices", "masteryNodeIndex", "masteryPath", "masteryStatusChangesLeft", "name", "nameSet", "nicknameEffect", "password", "streak", "streakFreezeCount", "streakUpdatedDate", "title", "xp", "xpBoostExpiresAt", "xpBoostPermanent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MarathonProgress_userId_marathonId_key" ON "MarathonProgress"("userId", "marathonId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLeague_userId_key" ON "UserLeague"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedStreak_user1Id_user2Id_key" ON "SharedStreak"("user1Id", "user2Id");

-- CreateIndex
CREATE UNIQUE INDEX "NpcInteraction_userId_npcId_key" ON "NpcInteraction"("userId", "npcId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "EasterEgg_key_key" ON "EasterEgg"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EasterEggUnlock_userId_eggId_key" ON "EasterEggUnlock"("userId", "eggId");
