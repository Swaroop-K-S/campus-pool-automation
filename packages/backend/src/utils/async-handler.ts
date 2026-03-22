import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async Express route handlers to catch rejection errors 
 * and pass them to the global error handler middleware.
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
