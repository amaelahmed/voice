import { Buffer } from "buffer";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

export interface Session {
  userId: string;
  email: string;
}

export function decodeSessionCookie(value: string): Session | null {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8")) as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get("session")?.value;

  if (!sessionData) return null;

  return decodeSessionCookie(sessionData);
}

export async function setSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  const sessionData = Buffer.from(JSON.stringify(session)).toString("base64");

  cookieStore.set("session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getCurrentUser() {
  const session = await getSession();

  if (session) {
    const existing = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (existing) return existing;

    return prisma.user.create({
      data: {
        id: session.userId,
        email: session.email,
      },
    });
  }

  let user = await prisma.user.findFirst({
    where: { email: "test@example.com" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
      },
    });
  }

  return user;
}
