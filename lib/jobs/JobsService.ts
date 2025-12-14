import { JobSource, JobListing } from '@prisma/client';
import { GreenhouseAdapter } from './GreenhouseAdapter';
import { LeverAdapter } from './LeverAdapter';
import { GenericAdapter } from './GenericAdapter';
import { JobAdapter, JobPost } from './types';
import { AiMatcher } from './AiMatcher';
import { prisma } from '../db';

export class JobsService {
  private adapters: Record<string, JobAdapter> = {
    'GREENHOUSE': new GreenhouseAdapter(),
    'LEVER': new LeverAdapter(),
    'GENERIC': new GenericAdapter(),
  };

  private matcher = new AiMatcher();

  async sync() {
    console.log("Starting job sync...");
    // 1. Fetch and Upsert Jobs
    const sources = await prisma.jobSource.findMany();
    
    for (const source of sources) {
        const adapter = this.adapters[source.type] || this.adapters['GENERIC'];
        console.log(`Fetching jobs for ${source.name} (${source.type})...`);
        
        const postings = await adapter.fetchJobs(source);
        console.log(`Found ${postings.length} jobs for ${source.name}`);
        
        for (const post of postings) {
            await prisma.jobListing.upsert({
                where: {
                    sourceId_externalId: {
                        sourceId: source.id,
                        externalId: post.externalId
                    }
                },
                update: {
                    title: post.title,
                    description: post.description,
                    url: post.url,
                    company: post.company,
                    location: post.location,
                    scrapedAt: new Date(),
                    postedAt: post.postedAt
                },
                create: {
                    sourceId: source.id,
                    externalId: post.externalId,
                    title: post.title,
                    description: post.description,
                    url: post.url,
                    company: post.company,
                    location: post.location,
                    postedAt: post.postedAt,
                    scrapedAt: new Date()
                }
            });
        }
    }

    // 2. Run Matcher
    console.log("Running AI Matcher...");
    await this.matcher.matchJobs();
    console.log("Sync complete.");
  }
}
