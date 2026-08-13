import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { roleHome } from "@/lib/auth-navigation";

export const proxy = withAuth(
  function roleProxy(request) {
    const token = request.nextauth.token;
    if (!token) return NextResponse.next();
    const pathname = request.nextUrl.pathname;

    if (token.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
    if (!token.mustChangePassword && pathname === "/change-password") {
      return NextResponse.redirect(new URL(roleHome(token.role), request.url));
    }
    const expectedRole = pathname.startsWith("/admin") ? "ADMIN"
      : pathname.startsWith("/teacher") ? "TEACHER"
        : pathname.startsWith("/student") ? "STUDENT"
          : null;
    if (expectedRole && token.role !== expectedRole) {
      return NextResponse.redirect(new URL(roleHome(token.role), request.url));
    }
    return NextResponse.next();
  },
  {
    secret: process.env.AUTH_SECRET,
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => Boolean(token?.userId) },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/dashboard", "/account/:path*", "/change-password"],
};
