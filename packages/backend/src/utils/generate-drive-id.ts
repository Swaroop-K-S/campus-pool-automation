import { ApplicationModel } from '../models';

export function generateDriveStudentId(companyName: string): string {
  const companyCode = companyName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `CP-${companyCode}${year}-${random}`;
}

export async function generateUniqueDriveId(companyName: string): Promise<string> {
  let id: string = '';
  let attempts = 0;

  do {
    id = generateDriveStudentId(companyName);
    const existing = await ApplicationModel.findOne({ driveStudentId: id });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  return id;
}
