import { prisma } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get("filter");

    // Build filter
    const where: { status?: ApplicationStatus } = {};
    if (filterParam && filterParam !== "") {
      where.status = filterParam as ApplicationStatus;
    }

    // Fetch applications with related data
    const applications = await prisma.applicationEvent.findMany({
      where,
      include: {
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get match scores for each job
    const applicationsWithScores = await Promise.all(
      applications.map(async (app) => {
        const matchScore = await prisma.matchScore.findUnique({
          where: {
            userId_jobListingId: {
              userId: app.userId,
              jobListingId: app.jobListingId,
            },
          },
          select: {
            score: true,
            telegramMessageTs: true,
          },
        });

        return {
          id: app.id,
          createdAt: app.createdAt.toISOString(),
          status: app.status,
          note: app.note,
          job: app.jobListing,
          matchScore: matchScore
            ? {
                score: matchScore.score,
                telegramMessageTs: matchScore.telegramMessageTs?.toISOString(),
              }
            : undefined,
        };
      })
    );

    // Calculate stats
    const allApplications = await prisma.applicationEvent.findMany({
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    const stats = {
      total: allApplications.length,
      approved: allApplications.filter(
        (a) => a.status === ApplicationStatus.APPROVED
      ).length,
      skipped: allApplications.filter(
        (a) => a.status === ApplicationStatus.SKIPPED
      ).length,
      notified: allApplications.filter(
        (a) => a.status === ApplicationStatus.NOTIFIED
      ).length,
      averageScore: 0,
    };

    // Calculate average match score
    const scores = await prisma.matchScore.findMany({
      select: {
        score: true,
      },
    });

    if (scores.length > 0) {
      const avgScore =
        scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      stats.averageScore = avgScore;
    }

    return NextResponse.json({
      applications: applicationsWithScores,
      stats,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch applications",
      },
      { status: 500 }
    );
  }
}
