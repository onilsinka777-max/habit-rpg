-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN "effect" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "bannerIcon" TEXT NOT NULL DEFAULT '🏋️',
    "bannerColor" TEXT NOT NULL DEFAULT '#fb923c',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Clan" ("bannerColor", "bannerIcon", "createdAt", "description", "id", "name", "tag") SELECT "bannerColor", "bannerIcon", "createdAt", "description", "id", "name", "tag" FROM "Clan";
DROP TABLE "Clan";
ALTER TABLE "new_Clan" RENAME TO "Clan";
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");
CREATE UNIQUE INDEX "Clan_tag_key" ON "Clan"("tag");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "streakFreezeCount" INTEGER NOT NULL DEFAULT 0,
    "lastTaskDate" DATETIME,
    "lastLoginBonusDate" DATETIME,
    "lastLegendaryQuestAt" DATETIME,
    "lastActiveAt" DATETIME,
    "clanId" INTEGER,
    "clanRole" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("clanId", "clanRole", "createdAt", "email", "gold", "id", "lastActiveAt", "lastLegendaryQuestAt", "lastLoginBonusDate", "lastTaskDate", "level", "name", "password", "streak", "xp") SELECT "clanId", "clanRole", "createdAt", "email", "gold", "id", "lastActiveAt", "lastLegendaryQuestAt", "lastLoginBonusDate", "lastTaskDate", "level", "name", "password", "streak", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
