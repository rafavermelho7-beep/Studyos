-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "due" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "elapsedDays" REAL NOT NULL DEFAULT 0,
    "scheduledDays" REAL NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReview" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewState_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReviewState" ("difficulty", "due", "elapsedDays", "id", "lapses", "lastReview", "reps", "scheduledDays", "stability", "state", "topicId", "updatedAt", "userId") SELECT "difficulty", "due", "elapsedDays", "id", "lapses", "lastReview", "reps", "scheduledDays", "stability", "state", "topicId", "updatedAt", "userId" FROM "ReviewState";
DROP TABLE "ReviewState";
ALTER TABLE "new_ReviewState" RENAME TO "ReviewState";
CREATE UNIQUE INDEX "ReviewState_topicId_key" ON "ReviewState"("topicId");
CREATE INDEX "ReviewState_userId_idx" ON "ReviewState"("userId");
CREATE INDEX "ReviewState_due_idx" ON "ReviewState"("due");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
