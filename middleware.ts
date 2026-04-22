import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const path = request.nextUrl.pathname

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/pos', '/products', '/sales', '/purchases', '/reports']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isAuthRoute = path === '/login' || path === '/register'
  const isApiRoute = path.startsWith('/api')

  // For API routes (except auth), verify token
  if (isApiRoute && !path.startsWith('/api/auth')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // For page routes
  if (!isApiRoute) {
    const isValidToken = token && await verifyToken(token)

    // Redirect to login if accessing protected route without valid token
    if (isProtectedRoute && !isValidToken) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', path)
      return NextResponse.redirect(url)
    }

    // Redirect to dashboard if accessing auth route with valid token
    if (isAuthRoute && isValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/pos/:path*',
    '/products/:path*',
    '/sales/:path*',
    '/purchases/:path*',
    '/reports/:path*',
    '/login',
    '/register'
  ]
}