import { prisma } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { matchScoreId } = await request.json();

    if (!matchScoreId) {
      return NextResponse.json(
        { error: "matchScoreId is required" },
        { status: 400 }
      );
    }

    const matchScore = await prisma.matchScore.findUnique({
      where: { id: matchScoreId },
      include: {
        user: true,
        jobListing: true,
      },
    });

    if (!matchScore) {
      return NextResponse.json(
        { error: "Match score not found" },
        { status: 404 }
      );
    }

    // Create QUEUED_FOR_SUBMISSION application event
    const appEvent = await prisma.applicationEvent.create({
      data: {
        userId: matchScore.userId,
        jobListingId: matchScore.jobListingId,
        status: ApplicationStatus.QUEUED_FOR_SUBMISSION,
        note: "Queued for manual confirmation before submission",
      },
    });

    return NextResponse.json({
      success: true,
      event: appEvent,
    });
  } catch (error) {
    console.error("Error approving application:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve application",
      },
      { status: 500 }
    );
  }
}
