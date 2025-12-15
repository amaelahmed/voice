import { randomUUID } from "node:crypto";

import type { JobAdapter, JobPost } from "../types";

type GenericAdapterOptions = {
  sourceName: string;
  baseUrl: string;
  feedUrl: string;
};

type RawJobPost = Partial<{
  externalId: unknown;
  url: unknown;
  title: unknown;
  company: unknown;
  location: unknown;
  rawDescription: unknown;
  publishedAt: unknown;
}>;

export class GenericAdapter implements JobAdapter {
  sourceName: string;
  baseUrl: string;
  private feedUrl: string;

  constructor(options: GenericAdapterOptions) {
    this.sourceName = options.sourceName;
    this.baseUrl = options.baseUrl;
    this.feedUrl = options.feedUrl;
  }

  async fetchJobs(): Promise<JobPost[]> {
    const response = await fetch(this.feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs for ${this.sourceName}: ${response.status}`);
    }

    const json: unknown = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(`Invalid jobs payload for ${this.sourceName}: expected array`);
    }

    return json.map((item) => this.normalize(item as RawJobPost));
  }

  private normalize(raw: RawJobPost): JobPost {
    const externalId = typeof raw.externalId === "string" && raw.externalId.length > 0 ? raw.externalId : randomUUID();

    const title = typeof raw.title === "string" ? raw.title : "";
    const company = typeof raw.company === "string" ? raw.company : "";
    const rawDescription = typeof raw.rawDescription === "string" ? raw.rawDescription : "";

    return {
      externalId,
      url: typeof raw.url === "string" ? raw.url : undefined,
      title,
      company,
      location: typeof raw.location === "string" ? raw.location : undefined,
      rawDescription,
      publishedAt: typeof raw.publishedAt === "string" || raw.publishedAt instanceof Date ? new Date(raw.publishedAt) : undefined,
    };
  }
}
