import {
  ExperienceLevel,
  PrismaClient,
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
