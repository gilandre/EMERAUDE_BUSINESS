import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (
      token?.mustChangePassword &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => !!token },
  }
);

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/marches/:path*",
    "/tresorerie/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/change-password",
  ],
};
