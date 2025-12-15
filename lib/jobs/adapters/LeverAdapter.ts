import { randomUUID } from "node:crypto";

import type { JobAdapter, JobPost } from "../types";

type LeverAdapterOptions = {
  sourceName: string;
  baseUrl: string;
  companyHandle: string;
};

type LeverJob = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  categories?: { location?: string };
  descriptionPlain?: string;
  createdAt?: number;
};

export class LeverAdapter implements JobAdapter {
  sourceName: string;
  baseUrl: string;
  private companyHandle: string;

  constructor(options: LeverAdapterOptions) {
    this.sourceName = options.sourceName;
    this.baseUrl = options.baseUrl;
    this.companyHandle = options.companyHandle;
  }

  async fetchJobs(): Promise<JobPost[]> {
    const feedUrl = `https://api.lever.co/v0/postings/${this.companyHandle}?mode=json`;

    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Lever jobs for ${this.sourceName}: ${response.status}`);
    }

    const json: unknown = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(`Invalid Lever jobs payload for ${this.sourceName}`);
    }

    return (json as LeverJob[]).map((job) => ({
      externalId: job.id ?? randomUUID(),
      url: job.hostedUrl,
      title: job.text ?? "",
      company: this.sourceName,
      location: job.categories?.location,
      rawDescription: job.descriptionPlain ?? "",
      publishedAt: typeof job.createdAt === "number" ? new Date(job.createdAt) : undefined,
    }));
  }
}
