export interface ATSResult {
  skills: string[];
  education: { degree: string; institution: string; year: string }[];
  projects: { title: string; description: string; techStack?: string[] }[];
}

export interface IStudentProfile {
  usn: string;
  name: string;
  email: string;
  phone?: string;
  branch?: string;
  collegeId?: string;
  strikes?: number;
  lastSeen?: Date;
  cgpa?: number;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  diplomaCGPA?: number;
  educationPath?: '12th Standard / PUC' | 'Diploma (Lateral Entry)' | 'Other';
  skills?: string[];
  certifications?: string[];
  projects?: { title: string; description: string; url?: string; }[];
  improvementPlan?: {
    strengths: string[];
    criticalWeakness: string;
    actionableNextSteps: string[];
    generatedAt: Date;
    driveId?: string;
  };
  parsingStatus?: 'pending' | 'completed' | 'failed';
  parsedResume?: ATSResult;
  resumeUrl?: string;
}
