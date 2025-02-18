import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Define the protected paths
  const protectedPaths = ['/dashboard', '/settings', '/profile'];

  const isProtectedRoute = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

// Apply middleware only to certain routes (optional)
export const config = {
  matcher: ["/:path*"],
};
