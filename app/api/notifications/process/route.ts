import { processReadyMatchScores } from "@/lib/workers/telegram-notification";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await processReadyMatchScores();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process notifications",
      },
      { status: 500 }
    );
  }
}
