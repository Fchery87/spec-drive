import { Request, Response, NextFunction } from 'express'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorHandler(
  error: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code
    })
  }

  // Handle specific error types
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    })
  }

  if (error.name === 'DatabaseError') {
    return res.status(500).json({
      success: false,
      error: 'Database operation failed'
    })
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
}