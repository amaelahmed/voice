import {
  ExperienceLevel,
  PrismaClient,
  ApplicationStatus,
  MatchScoreStatus,
  type Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

const jobSources: Array<Prisma.JobSourceCreateInput> = [
  {
    name: "LinkedIn",
    baseUrl: "https://www.linkedin.com/jobs",
    metadata: {
      kind: "scrape",
      notes: "Public job listings",
    },
  },
  {
    name: "Indeed",
    baseUrl: "https://www.indeed.com",
    metadata: {
      kind: "scrape",
      notes: "Job search index",
    },
  },
  {
    name: "Remote OK",
    baseUrl: "https://remoteok.com",
    metadata: {
      kind: "scrape",
      notes: "Remote-first listings",
    },
  },
];

async function main() {
  await prisma.experienceLevelPreset.createMany({
    data: [
      { level: ExperienceLevel.INTERN, sortOrder: 10 },
      { level: ExperienceLevel.JUNIOR, sortOrder: 20 },
      { level: ExperienceLevel.MID, sortOrder: 30 },
      { level: ExperienceLevel.SENIOR, sortOrder: 40 },
      { level: ExperienceLevel.STAFF, sortOrder: 50 },
      { level: ExperienceLevel.PRINCIPAL, sortOrder: 60 },
    ],
    skipDuplicates: true,
  });

  for (const source of jobSources) {
    await prisma.jobSource.upsert({
      where: { name: source.name },
      update: {
        baseUrl: source.baseUrl,
        metadata: source.metadata,
        isActive: true,
      },
      create: {
        name: source.name,
        baseUrl: source.baseUrl,
        metadata: source.metadata,
        isActive: true,
      },
    });
  }

  // Create test user with Telegram ID
  const testUser = await prisma.user.upsert({
    where: { id: "test-user-1" },
    update: {},
    create: {
      id: "test-user-1",
      email: "test@example.com",
      telegramUserId: "123456789",
    },
  });

  // Create test job listings
  const linkedinSource = await prisma.jobSource.findUnique({
    where: { name: "LinkedIn" },
  });

  if (!linkedinSource) {
    throw new Error("LinkedIn job source not found");
  }

  const testJob1 = await prisma.jobListing.upsert({
    where: {
      jobSourceId_externalId: {
        jobSourceId: linkedinSource.id,
        externalId: "test-job-1",
      },
    },
    update: {},
    create: {
      jobSourceId: linkedinSource.id,
      externalId: "test-job-1",
      title: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      url: "https://example.com/jobs/1",
      rawDescription: "We are looking for a senior software engineer with 5+ years of experience.",
    },
  });

  const testJob2 = await prisma.jobListing.upsert({
    where: {
      jobSourceId_externalId: {
        jobSourceId: linkedinSource.id,
        externalId: "test-job-2",
      },
    },
    update: {},
    create: {
      jobSourceId: linkedinSource.id,
      externalId: "test-job-2",
      title: "Full Stack Developer",
      company: "StartUp Inc",
      location: "Remote",
      url: "https://example.com/jobs/2",
      rawDescription: "Full stack developer needed for our growing team.",
    },
  });

  // Create match scores
  await prisma.matchScore.upsert({
    where: {
      userId_jobListingId: {
        userId: testUser.id,
        jobListingId: testJob1.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      jobListingId: testJob1.id,
      score: 0.85,
      explanation: "Great match based on experience and skills.",
      llmModel: "gpt-4",
      status: MatchScoreStatus.READY_FOR_REVIEW,
    },
  });

  await prisma.matchScore.upsert({
    where: {
      userId_jobListingId: {
        userId: testUser.id,
        jobListingId: testJob2.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      jobListingId: testJob2.id,
      score: 0.72,
      explanation: "Good match with some skill gaps.",
      llmModel: "gpt-4",
      status: MatchScoreStatus.PENDING,
    },
  });

  // Create sample application events
  await prisma.applicationEvent.upsert({
    where: { id: "app-event-1" },
    update: {},
    create: {
      id: "app-event-1",
      userId: testUser.id,
      jobListingId: testJob1.id,
      status: ApplicationStatus.APPROVED,
      note: "Approved via Telegram",
    },
  });

  console.log("Seed completed successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
