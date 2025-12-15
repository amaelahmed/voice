import { NextRequest, NextResponse } from "next/server";

import { setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email: normalizedEmail },
      });
    }

    await setSession({
      userId: user.id,
      email: user.email ?? normalizedEmail,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
