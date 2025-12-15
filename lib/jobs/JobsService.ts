import type { PrismaClient } from "@prisma/client";

import type { JobAdapter } from "./types";

type SyncJobsResult = {
  sourcesSynced: number;
  listingsUpserted: number;
};

export class JobsService {
  constructor(private prisma: PrismaClient) {}

  async syncJobs(adapters: JobAdapter[]): Promise<SyncJobsResult> {
    let sourcesSynced = 0;
    let listingsUpserted = 0;

    for (const adapter of adapters) {
      const jobSource = await this.prisma.jobSource.upsert({
        where: { name: adapter.sourceName },
        update: {
          baseUrl: adapter.baseUrl,
          isActive: true,
          lastScrapedAt: new Date(),
        },
        create: {
          name: adapter.sourceName,
          baseUrl: adapter.baseUrl,
          isActive: true,
          lastScrapedAt: new Date(),
        },
      });

      sourcesSynced += 1;

      const jobs = await adapter.fetchJobs();

      for (const job of jobs) {
        await this.prisma.jobListing.upsert({
          where: {
            jobSourceId_externalId: {
              jobSourceId: jobSource.id,
              externalId: job.externalId,
            },
          },
          update: {
            url: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            rawDescription: job.rawDescription,
            publishedAt: job.publishedAt,
          },
          create: {
            jobSourceId: jobSource.id,
            externalId: job.externalId,
            url: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            rawDescription: job.rawDescription,
            publishedAt: job.publishedAt,
          },
        });

        listingsUpserted += 1;
      }
    }

    return { sourcesSynced, listingsUpserted };
  }
}
