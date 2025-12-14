import { cookies } from "next/headers";

export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get("session")?.value;

  if (!sessionData) {
    return null;
  }

  try {
    // In production, this should be properly encrypted
    const session = JSON.parse(Buffer.from(sessionData, "base64").toString());
    return session;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  const sessionData = Buffer.from(JSON.stringify(session)).toString("base64");
  
  cookieStore.set("session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
