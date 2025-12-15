import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { JobsService } from "@/lib/jobs/JobsService";

function getAuthSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return request.nextUrl.searchParams.get("cron_secret");
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const provided = getAuthSecret(request);
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobsService = new JobsService(prisma);
  const result = await jobsService.syncJobs([]);

  return NextResponse.json({ ok: true, ...result });
}
