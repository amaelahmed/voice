-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERIC',
    "baseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_JobSource" ("baseUrl", "createdAt", "id", "name", "updatedAt") SELECT "baseUrl", "createdAt", "id", "name", "updatedAt" FROM "JobSource";
DROP TABLE "JobSource";
ALTER TABLE "new_JobSource" RENAME TO "JobSource";
CREATE UNIQUE INDEX "JobSource_name_key" ON "JobSource"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
