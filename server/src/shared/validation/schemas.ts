import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const CreateDealSchema = z.object({
  title: z.string().min(1).max(255),
  value: z.number().positive().optional(),
  status: z.enum(['NEW','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST']).default('NEW'),
  probability: z.number().min(0).max(100).optional(),
});

export const CreateWorkOrderSchema = z.object({
  work_type: z.enum(['SERVICE','REPAIR','RECALL','WARRANTY','PDI','BODYWORK','TIRES']),
  description: z.string().min(1),
  estimated_hours: z.number().positive(),
});

export const CreateTaskExecutionSchema = z.object({
  task_id: z.string().uuid(),
  input_data: z.record(z.string(), z.unknown()).optional(),
});

export const AdvanceTaskSchema = z.object({
  step: z.string().optional(),
  input_data: z.record(z.string(), z.unknown()).optional(),
  evidence_file: z.object({
    url: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number().optional(),
  }).optional(),
});

export const OverrideTaskSchema = z.object({
  reason: z.string().min(1),
  new_status: z.string(),
});

export const CreateQueueSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
});

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ error: 'VALIDATION_ERROR', details: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}
