import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "lumen_token";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow signup and login routes
  if (pathname.startsWith("/signup") || pathname === "/") {
    return NextResponse.next();
  }

  // Gate all /dashboard routes behind auth
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
