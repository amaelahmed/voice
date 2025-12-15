import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll } from "vitest";

import { AiMatcher } from "../AiMatcher";
import { JobsService } from "../JobsService";
import { GenericAdapter } from "../adapters/GenericAdapter";

type MockJob = {
  externalId: string;
  url?: string;
  title: string;
  company: string;
  location?: string;
  rawDescription: string;
  publishedAt?: string;
};

process.env.DATABASE_URL = "file:./dev-test.db";
process.env.OPENAI_API_KEY = "";

const prisma = new PrismaClient();

beforeAll(() => {
  rmSync("dev-test.db", { force: true });
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: process.env,
    stdio: "pipe",
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.matchScore.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.jobListing.deleteMany();
  await prisma.jobSource.deleteMany();
  await prisma.parsedCv.deleteMany();
  await prisma.cvDocument.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
});

describe("jobs pipeline", () => {
  it("ingests jobs via adapters and creates match scores without duplicates", async () => {
    const mockJobs: MockJob[] = [
      {
        externalId: "job-1",
        url: "https://example.com/jobs/1",
        title: "Frontend Engineer",
        company: "Acme",
        location: "Remote",
        rawDescription: "React, TypeScript, Next.js",
      },
      {
        externalId: "job-2",
        url: "https://example.com/jobs/2",
        title: "Backend Engineer",
        company: "Acme",
        location: "NYC",
        rawDescription: "Node.js, Postgres",
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockJobs), { status: 200 }));

    const jobsService = new JobsService(prisma);
    const adapter = new GenericAdapter({
      sourceName: "Acme",
      baseUrl: "https://example.com",
      feedUrl: "https://example.com/jobs.json",
    });

    await jobsService.syncJobs([adapter]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const listingsAfterFirstSync = await prisma.jobListing.findMany({
      orderBy: { externalId: "asc" },
    });

    expect(listingsAfterFirstSync.map((j) => j.externalId)).toEqual(["job-1", "job-2"]);

    await jobsService.syncJobs([adapter]);
    expect(await prisma.jobListing.count()).toBe(2);

    const user = await prisma.user.create({
      data: {
        email: "user@example.com",
      },
    });

    const cvDocument = await prisma.cvDocument.create({
      data: {
        userId: user.id,
        originalFileName: "cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: 123,
        storageKey: "local://cv.pdf",
        checksumSha256: "checksum-1",
      },
    });

    await prisma.parsedCv.create({
      data: {
        userId: user.id,
        cvDocumentId: cvDocument.id,
        profile: { summary: "Frontend engineer" },
        skills: { primary: ["react", "typescript"] },
        rawText: "Experienced frontend engineer. React TypeScript Next.js.",
      },
    });

    const matcher = new AiMatcher(prisma);

    const matchResult1 = await matcher.matchJobs({ userId: user.id });
    expect(matchResult1.created).toBe(2);

    const scores = await prisma.matchScore.findMany({
      where: { userId: user.id },
      orderBy: { jobListingId: "asc" },
    });

    expect(scores).toHaveLength(2);
    expect(scores[0]?.explanation.length).toBeGreaterThan(0);
    expect(scores[0]?.llmModel).toBe("heuristic");

    const matchResult2 = await matcher.matchJobs({ userId: user.id });
    expect(matchResult2.created).toBe(0);
    expect(await prisma.matchScore.count()).toBe(2);

    fetchMock.mockRestore();
  });
});
