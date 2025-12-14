import { prisma } from "@/lib/db";
import { ApplicationStatus, MatchScoreStatus } from "@prisma/client";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
    };
    chat_instance: string;
    message_id: number;
    chat_id: number;
    data: string;
  };
}

function verifyTelegramWebhook(body: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", "WebAppData");
  hmac.update(body);
  const computed = hmac.digest("hex");
  return computed === signature;
}

function parseCallbackData(data: string): {
  action: "APPROVE" | "SKIP" | "VIEW_JD" | null;
  matchScoreId: string;
} {
  const parts = data.split("|");
  const action = parts[0] as "APPROVE" | "SKIP" | "VIEW_JD" | null;
  const matchScoreId = parts[1] || "";
  return { action, matchScoreId };
}

async function handleApproval(matchScoreId: string, telegramUserId: string) {
  const matchScore = await prisma.matchScore.findUnique({
    where: { id: matchScoreId },
    include: {
      user: true,
      jobListing: true,
    },
  });

  if (!matchScore) {
    return { success: false, error: "Match score not found" };
  }

  if (matchScore.user.telegramUserId !== telegramUserId) {
    return { success: false, error: "Unauthorized user" };
  }

  // Create APPROVED application event
  await prisma.applicationEvent.create({
    data: {
      userId: matchScore.userId,
      jobListingId: matchScore.jobListingId,
      status: ApplicationStatus.APPROVED,
      note: "Approved via Telegram",
    },
  });

  // Mark match score as READY_FOR_REVIEW
  await prisma.matchScore.update({
    where: { id: matchScoreId },
    data: {
      status: MatchScoreStatus.READY_FOR_REVIEW,
    },
  });

  return { success: true };
}

async function handleSkip(matchScoreId: string, telegramUserId: string) {
  const matchScore = await prisma.matchScore.findUnique({
    where: { id: matchScoreId },
    include: {
      user: true,
    },
  });

  if (!matchScore) {
    return { success: false, error: "Match score not found" };
  }

  if (matchScore.user.telegramUserId !== telegramUserId) {
    return { success: false, error: "Unauthorized user" };
  }

  // Create SKIPPED application event
  await prisma.applicationEvent.create({
    data: {
      userId: matchScore.userId,
      jobListingId: matchScore.jobListingId,
      status: ApplicationStatus.SKIPPED,
      note: "Skipped via Telegram",
    },
  });

  // Mark match score as ARCHIVED
  await prisma.matchScore.update({
    where: { id: matchScoreId },
    data: {
      status: MatchScoreStatus.ARCHIVED,
    },
  });

  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("X-Telegram-Bot-API-Secret-Hash");

    // Verify webhook signature
    if (!signature || !verifyTelegramWebhook(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const update: TelegramUpdate = JSON.parse(body);

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { callback_query } = update;
      const telegramUserId = String(callback_query.from.id);
      const { action, matchScoreId } = parseCallbackData(callback_query.data);

      let result;
      if (action === "APPROVE") {
        result = await handleApproval(matchScoreId, telegramUserId);
      } else if (action === "SKIP") {
        result = await handleSkip(matchScoreId, telegramUserId);
      }

      if (!result?.success) {
        return NextResponse.json(result || { error: "Unknown action" }, {
          status: 400,
        });
      }

      // Answer the callback query to remove the loading state from the button
      const answer_url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
      await fetch(answer_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback_query.id,
          text:
            action === "APPROVE"
              ? "✅ Application approved!"
              : "⏭️ Job skipped",
          show_alert: false,
        }),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
