import { prisma } from "@/lib/db";
import { MatchScoreStatus } from "@prisma/client";
import { sendJobNotification } from "@/lib/telegram";

const RATE_LIMIT_MS = 1000; // 1 second between messages to avoid Telegram rate limits
const lastNotificationTime = new Map<string, number>();

async function shouldThrottle(userId: string): Promise<boolean> {
  const lastTime = lastNotificationTime.get(userId) || 0;
  const now = Date.now();

  if (now - lastTime < RATE_LIMIT_MS) {
    return true;
  }

  lastNotificationTime.set(userId, now);
  return false;
}

export async function notifyMatchScoreReady(matchScoreId: string) {
  try {
    const matchScore = await prisma.matchScore.findUnique({
      where: { id: matchScoreId },
      include: {
        user: true,
        jobListing: {
          include: {
            jobSource: true,
          },
        },
      },
    });

    if (!matchScore) {
      throw new Error(`Match score not found: ${matchScoreId}`);
    }

    if (!matchScore.user.telegramUserId) {
      console.log(`User ${matchScore.user.id} has no Telegram ID`);
      return;
    }

    if (matchScore.status !== MatchScoreStatus.READY_FOR_REVIEW) {
      console.log(
        `Match score ${matchScoreId} is not in READY_FOR_REVIEW status`
      );
      return;
    }

    // Check rate limiting
    if (await shouldThrottle(matchScore.userId)) {
      console.log(`Rate limiting notification for user ${matchScore.userId}`);
      return;
    }

    const chatId = parseInt(matchScore.user.telegramUserId, 10);

    if (isNaN(chatId)) {
      throw new Error(
        `Invalid Telegram ID for user ${matchScore.user.id}: ${matchScore.user.telegramUserId}`
      );
    }

    const result = await sendJobNotification(
      chatId,
      matchScore.jobListing.title,
      matchScore.jobListing.company,
      matchScore.score,
      matchScoreId,
      matchScore.jobListing.url || undefined,
      matchScore.jobListing.location || undefined
    );

    // Update match score with Telegram message info
    await prisma.matchScore.update({
      where: { id: matchScoreId },
      data: {
        telegramMessageId: String(result.message_id),
        telegramMessageTs: new Date(result.date * 1000),
      },
    });

    console.log(
      `Sent notification for match score ${matchScoreId} to user ${matchScore.user.telegramUserId}`
    );
  } catch (error) {
    console.error(
      `Error notifying match score ${matchScoreId}:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

export async function processReadyMatchScores() {
  try {
    const readyScores = await prisma.matchScore.findMany({
      where: {
        status: MatchScoreStatus.READY_FOR_REVIEW,
        telegramMessageId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            telegramUserId: true,
          },
        },
      },
    });

    console.log(`Found ${readyScores.length} ready match scores to notify`);

    for (const score of readyScores) {
      try {
        await notifyMatchScoreReady(score.id);
      } catch (error) {
        console.error(
          `Failed to notify match score ${score.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  } catch (error) {
    console.error(
      "Error processing ready match scores:",
      error instanceof Error ? error.message : error
    );
  }
}
