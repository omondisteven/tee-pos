// lib\auth.ts
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables')
}

// Convert secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET)

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  // Convert payload to a plain object that jose accepts
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  }
  
  const token = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  
  return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    // Type assertion to our JWTPayload type
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(password, hashed)
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Check cookie first
  const cookieToken = req.cookies.get('token')?.value
  if (cookieToken) return cookieToken
  
  // Check authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  return null
}

export async function getAuthenticatedUser(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return null
  
  const payload = await verifyToken(token)
  if (!payload) return null
  
  return payload
}