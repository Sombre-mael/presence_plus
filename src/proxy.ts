import { NextResponse } from "next/server";

// La protection Auth.js et les rôles seront ajoutés lors du prochain jalon.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/dashboard"],
};
