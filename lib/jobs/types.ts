import { JobSource } from '@prisma/client';

export interface JobPost {
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedAt?: Date;
}

export interface JobAdapter {
  fetchJobs(source: JobSource): Promise<JobPost[]>;
}
