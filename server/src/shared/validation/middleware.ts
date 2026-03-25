/**
 * Zod validation middleware — pixdrift enterprise standard
 *
 * Usage:
 *   import { validate } from '../shared/validation/middleware';
 *   import { CreateDealSchema } from '../shared/validation/schemas';
 *
 *   router.post('/deals', validate(CreateDealSchema), async (req, res) => { ... });
 *
 * On failure: throws ValidationError with flattened Zod error details.
 * On success: req.body is replaced with the parsed (and coerced) data.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../middleware/error-handler';

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError('Invalid request body', result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError('Invalid query parameters', result.error.flatten()));
      return;
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
