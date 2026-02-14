import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/marches/:path*",
    "/tresorerie/:path*",
    "/admin/:path*",
    "/profil/:path*",
  ],
};
