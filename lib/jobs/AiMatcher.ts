import OpenAI from "openai";

import type { JobListing, ParsedCv, PrismaClient, User } from "@prisma/client";

type AiMatcherOptions = {
  openai?: OpenAI;
  model?: string;
};

type ScoreResult = {
  score: number;
  explanation: string;
  llmModel: string;
};

export class AiMatcher {
  private openai: OpenAI | null;
  private model: string;

  constructor(
    private prisma: PrismaClient,
    options: AiMatcherOptions = {},
  ) {
    this.openai =
      options.openai ??
      (process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null);

    this.model = options.model ?? "gpt-4o-mini";
  }

  async matchJobs(options: { userId?: string; jobListingIds?: string[] } = {}) {
    const users = await this.prisma.user.findMany({
      where: options.userId ? { id: options.userId } : undefined,
      include: {
        parsedCvs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const jobListings = await this.prisma.jobListing.findMany({
      where: options.jobListingIds ? { id: { in: options.jobListingIds } } : undefined,
    });

    let created = 0;

    for (const user of users) {
      const parsedCv = user.parsedCvs[0];
      if (!parsedCv) continue;

      const existing = await this.prisma.matchScore.findMany({
        where: {
          userId: user.id,
          jobListingId: { in: jobListings.map((j) => j.id) },
        },
        select: { jobListingId: true },
      });

      const existingIds = new Set(existing.map((m) => m.jobListingId));

      for (const jobListing of jobListings) {
        if (existingIds.has(jobListing.id)) continue;

        const scored = await this.score(user, parsedCv, jobListing);

        await this.prisma.matchScore.create({
          data: {
            userId: user.id,
            jobListingId: jobListing.id,
            score: scored.score,
            explanation: scored.explanation,
            llmModel: scored.llmModel,
          },
        });

        created += 1;
      }
    }

    return { created };
  }

  private async score(user: User, parsedCv: ParsedCv, jobListing: JobListing): Promise<ScoreResult> {
    if (!this.openai) {
      return this.scoreHeuristic(user, parsedCv, jobListing);
    }

    try {
      const content = `User CV:\n${parsedCv.rawText ?? ""}\n\nJob:\n${jobListing.title}\n\n${jobListing.rawDescription}`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You score how well a job matches a CV. Respond as JSON: { score: number (0..1), explanation: string }.",
          },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      });

      const message = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(message) as Partial<{ score: unknown; explanation: unknown }>;

      const score = typeof parsed.score === "number" ? parsed.score : 0;
      const explanation = typeof parsed.explanation === "string" ? parsed.explanation : "";

      return {
        score: Math.max(0, Math.min(1, score)),
        explanation,
        llmModel: this.model,
      };
    } catch {
      return this.scoreHeuristic(user, parsedCv, jobListing);
    }
  }

  private scoreHeuristic(user: User, parsedCv: ParsedCv, jobListing: JobListing): ScoreResult {
    const cvText = `${parsedCv.rawText ?? ""} ${JSON.stringify(parsedCv.skills)} ${JSON.stringify(parsedCv.profile)}`.toLowerCase();
    const titleWords = jobListing.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const hits = titleWords.filter((w) => cvText.includes(w)).length;
    const score = titleWords.length > 0 ? hits / titleWords.length : 0;

    return {
      score,
      explanation: `Heuristic match for ${user.email ?? user.id}: ${hits}/${titleWords.length} title keywords found in CV text.`,
      llmModel: "heuristic",
    };
  }
}
