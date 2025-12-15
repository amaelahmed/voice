export type JobPost = {
  externalId: string;
  url?: string;
  title: string;
  company: string;
  location?: string;
  rawDescription: string;
  publishedAt?: Date;
};

export interface JobAdapter {
  sourceName: string;
  baseUrl: string;
  fetchJobs(): Promise<JobPost[]>;
}
