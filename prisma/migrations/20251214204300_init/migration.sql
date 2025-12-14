-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roleKeyword" TEXT,
    "location" TEXT
);

-- CreateTable
CREATE TABLE "ParsedCv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "experience" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParsedCv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "postedAt" DATETIME,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "JobListing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "score" REAL NOT NULL,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedCv_userId_key" ON "ParsedCv"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_name_key" ON "JobSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_url_key" ON "JobListing"("url");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_sourceId_externalId_key" ON "JobListing"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScore_userId_jobId_key" ON "MatchScore"("userId", "jobId");
