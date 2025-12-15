import { NextRequest, NextResponse } from "next/server";

function hasValidSessionCookie(request: NextRequest): boolean {
  const value = request.cookies.get("session")?.value;
  if (!value) return false;

  try {
    const decoded = JSON.parse(atob(value)) as { userId?: string; email?: string };
    return Boolean(decoded.userId && decoded.email);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!hasValidSessionCookie(request)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cv/:path*", "/preferences/:path*"],
};
