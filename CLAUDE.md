# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (from `backend/`)
```bash
node src/server.js                        # start server on port 3001
npx prisma migrate dev --name <name>      # apply schema changes
npx prisma studio                         # open DB browser
node prisma/seed.js                       # seed quest templates
node prisma/seedShop.js                   # seed shop items
node prisma/seedLegendary.js              # seed legendary quest templates
node prisma/seedMegaUpdate.js             # seed seasons, quest chains, artifacts, shop wave1
node prisma/seedWave2.js                  # seed marathons, skills (20), easter eggs (10)
node prisma/seedBoosters.js               # seed booster shop items
node prisma/seedChainUpdate.js            # seed 4 epic quest chains with lore/stepReqs
lsof -ti:3001 | xargs kill -9            # force-kill old server
```

### Frontend (from `frontend/`)
```bash
npm run dev     # start Vite dev server
npm run build   # production build
npm run lint    # ESLint
```

## Architecture

### Stack
- **Backend**: Node.js + Express (CommonJS `require`) + Prisma ORM + SQLite (`backend/prisma/dev.db`)
- **Frontend**: React 19 + Vite (ESM `import`) + Axios + Recharts
- **Auth**: JWT signed with hardcoded `"super-secret-key"`, sent as `Authorization: Bearer <token>`
- **AI**: `@anthropic-ai/sdk` in `backend/src/aiCoach.js`, key from `backend/.env` → `ANTHROPIC_API_KEY`

### Backend structure
Everything lives in `backend/src/server.js` — a single monolithic Express file. Helper modules:
- `constants.js` — all game constants, mastery path definitions, XP/gold formulas (`applyXpGain`, `getMasteryMultipliers`, `getXpToNextLevel`), the mastery graph with DAG predecessors
- `questGenerator.js` — called on every `GET /tasks`; applies missed-quest gold penalties, cleans expired daily quests, then fills each branch×type to target counts from `QuestTemplate` DB table
- `legendaryWeekly.js` — called on every `GET /tasks`; only runs if `hasEverFinishedMastery === true`; creates one legendary quest per week
- `mastery.js` — `computeAutoClass(userId)` queries completed tasks to infer 5-class system (warrior/sage/strategist/explorer/balance)
- `npc.js` — 5 NPC mentors with branch affinity, weekly quests, tips; `getAvailableNpcs(level)` returns accessible ones
- `aiCoach.js` — calls Claude API with user stats, caches advice in `user.aiCoachAdvice` for 6 hours
- `prisma.js` — singleton Prisma client

### Frontend structure
`App.jsx` is the root and holds all state (user, tasks, shop items, library, active view, toasts, modals). It renders `<PlayerCard>` plus one section component at a time based on `view` state.

Components receive these standard props: `token` (JWT string), `showToast(message, type)`, `askConfirm({title, text, onConfirm})`. They construct their own `authHeaders` locally.

All components resolve the API URL as:
```js
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
```

### Nav views (App.jsx NAV_ITEMS)
`quests`, `chains`, `worldmap`, `marathons`, `season`, `league`, `shop`, `library`, `skills`, `npc`, `friends`, `feed`, `gratitude`, `journal`, `goals`, `clan`, `mastery`, `pet`, `achievements`, `stats`, `pomodoro`, `report`, `profile`, `ai-coach`, `focus`

Hotkeys: `F` toggles FocusMode overlay, `Ctrl+K` opens SmartSearch, `ESC` closes both.

### Key game mechanics

**Daily quests**: `GET /tasks` triggers `ensureDailyQuests` which fills 2 required + 6 recommended quests per branch per day from `QuestTemplate` rows (filtered by `minLevel`/`maxLevel`). Quests expire at `endOfToday()`. Missed required quests incur a gold penalty on next load.

**Adaptive difficulty**: `QuestTemplate` has `baseReps`, `repScaling`, `baseDifficulty`. `actualReps = baseReps + (level * repScaling)`. Easy→medium boundary at 1.25×, medium→hard at 1.67×.

**Streak**: Increments when all required tasks for today are completed. Streak Freeze extends by 1 day if a day was missed. Chest rewards at milestones 7/14/21/28 days.

**XP & level-up**: `applyXpGain(xp, level, gain)` loops level-ups. XP to next level = `300 + (level-1)*20` (lvl1=300, lvl10=480, lvl20=680). XP multipliers stack: active boost (×1.5) × permanent boost (×1.25) × mastery bonus (×1.1 for primary branches). Skill tree bonuses apply on top.

**Onboarding**: First-time users see `OnboardingTest.jsx` — 5 questions → suggested class. Result saved in `user.onboardingDone` + `user.onboardingData` (JSON).

**Dark Screen**: If `user.lastActiveQuestDate` is 3+ days ago, `DarkScreen.jsx` shows on login. "Accept revival" creates a special quest via `POST /me/revival`.

**Weekly XP / Leagues**: Every completed task increments `UserLeague.weeklyXp`. 5 tiers: Бронза→Серебро→Золото→Платина→Бриллиант. Reset Sundays at 23:59 (not yet auto-implemented — manual trigger needed).

**Marathons**: 4 marathons (30/21/14/7 days). `POST /marathons/:id/checkin` validates that ≥1 quest in the marathon's branch was completed today. Missing a day sets `failed=true`.

**Gratitude**: Daily 3-field entry via `POST /gratitude`. +20 XP bonus. Checked against `createdAt` within `startOfToday()..endOfToday()`.

**Skill Tree**: 20 skills (4 branches × 5 tiers). `Skill.requires` is JSON array of prerequisite skill IDs. Buy with gold via `POST /skills/:id/unlock`. Effects are stored in DB but application logic needs to be wired into XP/gold calculations manually.

**Easter Eggs**: 10 hidden achievements in `EasterEgg` table. `checkEasterEgg(userId, key)` called at relevant points (task complete, message count, etc.). Triggers notification on first unlock.

**NPC Mentors**: 5 NPCs in `npc.js`. Interact once per week via `POST /npc/:id/interact` → creates weekly quest + returns tip. `unlockLevel` gates access.

**AI Coach**: `GET /ai-coach/advice` calls Claude API with user stats. Response cached in `user.aiCoachAdvice` for 6 hours. Falls back to default message if `ANTHROPIC_API_KEY` not set.

**Smart Search**: `GET /search?q=...` searches tasks, friends, achievements, sections. Frontend `SmartSearch.jsx` opens with Ctrl+K, navigates with arrows, Enter confirms.

**Shop lock**: Items with `category !== "boost"` and `effect !== "name_change_scroll"` are locked until `user.hasEverFinishedMastery === true`. Themes are all free (no purchase required).

**Navigation**: `BottomNav.jsx` has 4 tabs (Квесты/Мир/Социалка/Профиль); each tab navigates to its section home page, `≡` button opens a submenu sheet. Loading: `LoadingScreen.jsx` (once per session via `sessionStorage`). First-run: `ThemeChoiceScreen.jsx` (once via `localStorage:theme_chosen`), then `WelcomeNPC.jsx` (once via `localStorage:welcome_npc_done`).

**Onboarding dismiss**: `localStorage:onboarding_dismissed` prevents OnboardingTest from re-showing after user clicks "Позже".

**Mastery**: Unlocks at level 25. User chooses a path (warrior/sage/leader/balance). DAG of 25 nodes + legendary node in `constants.js` → `MASTERY_GRAPH`. Finishing sets `hasEverFinishedMastery = true`.

**Achievements**: 18 types in `ACHIEVEMENT_META` (server.js). Each has `xpReward`. `handlePostComplete` checks and grants. Unlocking ≥1 → title "Герой", ≥4 → "Легенда".

**Pet**: Auto-created when streak ≥ 7. Stages: egg (7–13) → baby (14–29) → adult (30+). Hunger grows at 4%/hour.

### Branches
Four branches: `discipline`, `fitness`, `self_development`, `knowledge`. All branch keys are snake_case in the DB.

### React StrictMode caveat
StrictMode is active in dev (`main.jsx`). Effects run twice — `GET /tasks` fires twice on mount, which is why `questGenerator.js` includes trim logic to delete excess quests if more than the target count exist.

### Schema tables (Prisma)
Core: `User`, `Task`, `QuestTemplate`, `LegendaryQuestTemplate`, `ShopItem`, `Purchase`
Social: `Friendship`, `FriendRequest`, `DirectMessage`, `Clan`, `ClanMessage`
Progression: `Achievement`, `Mastery` (via User fields), `Pet`, `JournalEntry`, `Goal`
Wave 1: `Notification`, `CoopQuest`, `Reaction`, `ActivityFeed`, `ClanWar`, `ClanWarScore`, `Season`, `SeasonProgress`, `QuestChain`, `QuestChainProgress`, `Artifact`, `UserArtifact`, `WeeklyShopItem`, `CraftRecipe`
Wave 2: `Marathon`, `MarathonProgress`, `Gratitude`, `UserLeague`, `Duel`, `SharedStreak`, `NpcInteraction`, `Skill`, `UserSkill`, `EasterEgg`, `EasterEggUnlock`
