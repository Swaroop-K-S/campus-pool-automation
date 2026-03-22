import { Request, Response, NextFunction } from 'express';
import { Role } from '@campuspool/shared';

/**
 * Middleware to restrict access based on user role.
 * Requires `authenticate` middleware to run first.
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
