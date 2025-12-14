/**
 * Development endpoint for testing Telegram webhook locally.
 * This endpoint simulates a Telegram callback query without signature verification.
 * IMPORTANT: Only enable in development mode.
 */

import { prisma } from "@/lib/db";
import { ApplicationStatus, MatchScoreStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

interface TestWebhookRequest {
  action: "APPROVE" | "SKIP";
  matchScoreId: string;
  telegramUserId?: string;
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test endpoints disabled in production" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as TestWebhookRequest;
    const { action, matchScoreId, telegramUserId } = body;

    if (!action || !matchScoreId) {
      return NextResponse.json(
        { error: "action and matchScoreId are required" },
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

    // If telegramUserId not provided, use the user's actual Telegram ID
    const userId = telegramUserId || matchScore.user.telegramUserId;

    if (!userId) {
      return NextResponse.json(
        { error: "User has no Telegram ID" },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      // Create APPROVED application event
      const event = await prisma.applicationEvent.create({
        data: {
          userId: matchScore.userId,
          jobListingId: matchScore.jobListingId,
          status: ApplicationStatus.APPROVED,
          note: "Approved via test webhook",
        },
      });

      // Update match score status
      const updated = await prisma.matchScore.update({
        where: { id: matchScoreId },
        data: {
          status: MatchScoreStatus.READY_FOR_REVIEW,
        },
      });

      return NextResponse.json({
        success: true,
        action: "APPROVE",
        event,
        matchScore: updated,
        job: {
          title: matchScore.jobListing.title,
          company: matchScore.jobListing.company,
        },
      });
    } else if (action === "SKIP") {
      // Create SKIPPED application event
      const event = await prisma.applicationEvent.create({
        data: {
          userId: matchScore.userId,
          jobListingId: matchScore.jobListingId,
          status: ApplicationStatus.SKIPPED,
          note: "Skipped via test webhook",
        },
      });

      // Update match score status
      const updated = await prisma.matchScore.update({
        where: { id: matchScoreId },
        data: {
          status: MatchScoreStatus.ARCHIVED,
        },
      });

      return NextResponse.json({
        success: true,
        action: "SKIP",
        event,
        matchScore: updated,
        job: {
          title: matchScore.jobListing.title,
          company: matchScore.jobListing.company,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
