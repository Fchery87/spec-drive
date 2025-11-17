import { Request, Response, NextFunction } from 'express'
import { db } from '../../db/index'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { verifyAccessToken } from '../utils/tokenGenerator'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name?: string
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No valid authorization header'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    // Verify access token
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    // Fetch user from database to get full info
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))

    if (foundUsers.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      })
    }

    const user = foundUsers[0]

    // Set user on request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    })
  }
}