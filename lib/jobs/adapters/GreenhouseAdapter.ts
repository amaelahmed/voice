import { randomUUID } from "node:crypto";

import type { JobAdapter, JobPost } from "../types";

type GreenhouseAdapterOptions = {
  sourceName: string;
  baseUrl: string;
  boardToken: string;
};

type GreenhouseJob = {
  id?: number | string;
  title?: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
  absolute_url?: string;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

export class GreenhouseAdapter implements JobAdapter {
  sourceName: string;
  baseUrl: string;
  private boardToken: string;

  constructor(options: GreenhouseAdapterOptions) {
    this.sourceName = options.sourceName;
    this.baseUrl = options.baseUrl;
    this.boardToken = options.boardToken;
  }

  async fetchJobs(): Promise<JobPost[]> {
    const feedUrl = `https://boards-api.greenhouse.io/v1/boards/${this.boardToken}/jobs`;

    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Greenhouse jobs for ${this.sourceName}: ${response.status}`);
    }

    const json = (await response.json()) as GreenhouseResponse;
    const jobs = Array.isArray(json.jobs) ? json.jobs : [];

    return jobs.map((job) => {
      const externalId = job.id !== undefined ? String(job.id) : randomUUID();

      return {
        externalId,
        url: job.absolute_url,
        title: job.title ?? "",
        company: this.sourceName,
        location: job.location?.name,
        rawDescription: job.content ?? "",
        publishedAt: job.updated_at ? new Date(job.updated_at) : undefined,
      };
    });
  }
}
