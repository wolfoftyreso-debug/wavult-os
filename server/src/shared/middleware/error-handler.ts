/**
 * Centralized error handling — pixdrift enterprise standard
 *
 * ALL errors must be instances of AppError or subclasses.
 * Unknown errors are logged server-side, never exposed to client.
 *
 * Usage in routers:
 *   throw new NotFoundError('Deal');
 *   throw new ValidationError('Invalid input', result.error.flatten());
 *   throw new AuthorizationError();
 */

import { Request, Response, NextFunction } from 'express';

// ─── Base error class ────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: object;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: object
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Typed subclasses ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: object) {
    super(422, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'AuthorizationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    // Never expose raw DB error message in production
    super(
      500,
      'DATABASE_ERROR',
      process.env.NODE_ENV === 'production' ? 'A database error occurred' : message
    );
    this.name = 'DatabaseError';
  }
}

// ─── Global error handler middleware ────────────────────────────────────────
// Must be registered LAST in Express: app.use(errorHandler)

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && err.details
        ? { details: err.details }
        : {}),
    });
    return;
  }

  // Unknown / unhandled error — log fully, respond generically
  console.error('[errorHandler] Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
