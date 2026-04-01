// ── Template Variable Resolver ──────────────────
// Resolves {{variable}} placeholders in message templates

export interface TemplateVariables {
  name: string;
  usn: string;
  branch: string;
  cgpa: string;
  email: string;
  phone: string;
  driveId: string;
  referenceNumber: string;
  companyName: string;
  jobRole: string;
  ctc: string;
  eventDate: string;
  venueName: string;
  collegeName: string;
  statusPageUrl: string;
}

export function resolveTemplate(
  template: string,
  vars: Partial<TemplateVariables>
): string {
  let result = template;
  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value || '—');
  });
  // Clean up any unreplaced variables
  result = result.replace(/\{\{.*?\}\}/g, '—');
  return result;
}

// Smart field extraction from app.data (handles UUID keys)
function getField(data: Record<string, any>, keys: string[]): string {
  if (!data) return '';
  // Try exact keys
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== '') return String(data[k]);
  }
  // Try field.id-based lookup — iterate all entries
  const lowerKeys = keys.map(k => k.toLowerCase());
  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val === 'object') continue;
    if (lowerKeys.includes(key.toLowerCase())) return String(val);
  }
  return '';
}

export function buildVarsForStudent(
  application: any,
  drive: any,
  college: any
): TemplateVariables {
  const d = application.data || {};
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const driveId = drive?._id?.toString() || drive?.id || '';
  return {
    name: getField(d, ['name', 'Name', 'full_name', 'fullname', 'Full Name', 'student_name']),
    usn: getField(d, ['usn', 'USN', 'roll_no', 'rollno', 'reg_no']),
    branch: getField(d, ['branch', 'Branch', 'department', 'dept']),
    cgpa: getField(d, ['cgpa', 'CGPA', 'gpa', 'GPA']),
    email: getField(d, ['email', 'Email', 'email_id', 'emailid']),
    phone: getField(d, ['phone', 'Phone', 'mobile', 'contact', 'phone_no']),
    driveId: application.driveStudentId || '',
    referenceNumber: application.referenceNumber || '',
    companyName: drive?.companyName || '',
    jobRole: drive?.jobRole || '',
    ctc: drive?.ctc || '',
    eventDate: drive?.eventDate
      ? new Date(drive.eventDate).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
      : 'To be announced',
    venueName: drive?.venueDetails?.hallName || '',
    collegeName: college?.name || '',
    statusPageUrl: driveId ? `${frontendUrl}/event/${driveId}/my-status` : '',
  };
}
