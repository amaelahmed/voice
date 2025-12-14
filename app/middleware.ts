import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Check if accessing protected routes
  if (request.nextUrl.pathname.startsWith("/(dashboard)") || request.nextUrl.pathname.startsWith("/dashboard")) {
    const session = await getSession();
    
    if (!session) {
      // Redirect to login or auth page
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/(dashboard)/:path*", "/dashboard/:path*"],
};
