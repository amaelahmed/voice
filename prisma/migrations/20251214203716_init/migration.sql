-- CreateTable
CREATE TABLE "ExperienceLevelPreset" (
    "level" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT,
    "telegramUserId" TEXT
);

-- CreateTable
CREATE TABLE "CvDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageProvider" TEXT NOT NULL DEFAULT 's3',
    "storageKey" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    CONSTRAINT "CvDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedCv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "cvDocumentId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "rawText" TEXT,
    CONSTRAINT "ParsedCv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedCv_cvDocumentId_fkey" FOREIGN KEY ("cvDocumentId") REFERENCES "CvDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRoles" JSONB NOT NULL,
    "targetLocations" JSONB NOT NULL,
    "experienceLevel" TEXT NOT NULL,
    "workTypes" JSONB NOT NULL,
    "employmentTypes" JSONB NOT NULL,
    "companySizes" JSONB NOT NULL,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT DEFAULT 'USD',
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "metadata" JSONB,
    "lastScrapedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jobSourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "seniority" TEXT,
    "rawDescription" TEXT NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "JobListing_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "explanation" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    CONSTRAINT "MatchScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchScore_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "ApplicationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicationEvent_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");

-- CreateIndex
CREATE INDEX "CvDocument_userId_idx" ON "CvDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CvDocument_userId_checksumSha256_key" ON "CvDocument"("userId", "checksumSha256");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedCv_cvDocumentId_key" ON "ParsedCv"("cvDocumentId");

-- CreateIndex
CREATE INDEX "ParsedCv_userId_idx" ON "ParsedCv"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_name_key" ON "JobSource"("name");

-- CreateIndex
CREATE INDEX "JobListing_jobSourceId_idx" ON "JobListing"("jobSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_jobSourceId_externalId_key" ON "JobListing"("jobSourceId", "externalId");

-- CreateIndex
CREATE INDEX "MatchScore_jobListingId_idx" ON "MatchScore"("jobListingId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScore_userId_jobListingId_key" ON "MatchScore"("userId", "jobListingId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_userId_jobListingId_createdAt_idx" ON "ApplicationEvent"("userId", "jobListingId", "createdAt");
