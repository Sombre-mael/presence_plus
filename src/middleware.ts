import { NextResponse } from "next/server";

// Middleware placeholder conserve pour stabiliser le serveur dev pendant la migration vers proxy.ts.
export function middleware() {
  return NextResponse.next();
}
