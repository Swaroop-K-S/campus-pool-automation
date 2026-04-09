import { AuditLogModel } from '../models/audit-log.model';
import mongoose from 'mongoose';

export const logAuditEvent = async (params: {
  userId: string | mongoose.Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}) => {
  try {
    await AuditLogModel.create({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};
