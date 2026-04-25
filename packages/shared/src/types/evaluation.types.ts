export interface Evaluation {
  applicationId: string;
  driveId: string;
  roomId?: string;
  roundType: string;
  evaluatorName: string;
  scores: {
    trait: string;
    score: number;
  }[];
  comments?: string;
  decision: 'Pass' | 'Fail';
  evaluatedAt: Date;
}

export interface IAuditLog {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}
