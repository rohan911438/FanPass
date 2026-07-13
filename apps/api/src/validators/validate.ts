import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Wraps a Zod schema (usually from @fanpass/shared) as Express middleware. Parses req.body in place
 * so controllers receive an already-typed, already-valid payload — thrown ZodErrors are caught by
 * the global errorHandler.
 */
export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
