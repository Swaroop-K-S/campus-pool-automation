import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/async-handler';
import { DriveModel, ApplicationModel, CollegeModel, RoomModel } from '../models';
import { FormFieldModel } from '../models/form-field.model';

// ── COLORS ──────────────────────────────
const COLORS = {
  headerBg: '4F46E5',
  headerText: 'FFFFFF',
  applied: 'EFF6FF',
  shortlisted: 'EEF2FF',
  attended: 'F5F3FF',
  selected: 'F0FDF4',
  rejected: 'FFF1F2',
  altRow: 'F8FAFC',
};

// ── HELPER: style header row ─────────────
function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + COLORS.headerBg }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FF' + COLORS.headerText },
      size: 11,
      name: 'Calibri'
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3730A3' } }
    };
  });
}

// ── HELPER: style data row ───────────────
function styleDataRow(row: ExcelJS.Row, index: number, statusColor?: string) {
  row.height = 22;
  const bg = statusColor || (index % 2 === 0 ? COLORS.altRow : 'FFFFFF');
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + bg }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.font = { size: 10, name: 'Calibri' };
  });
}

// ── HELPER: get status color ─────────────
function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    applied: COLORS.applied,
    shortlisted: COLORS.shortlisted,
    attended: COLORS.attended,
    selected: COLORS.selected,
    rejected: COLORS.rejected
  };
  if (status?.includes('passed')) return COLORS.shortlisted;
  if (status?.includes('failed')) return COLORS.rejected;
  return map[status] || COLORS.altRow;
}

// ── HELPER: format date ──────────────────
function fmtDate(date: any): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── HELPER: add info rows at top ─────────
function addInfoHeader(sheet: ExcelJS.Worksheet, info: { label: string; value: string }[]) {
  info.forEach(({ label, value }) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF64748B' } };
    row.getCell(2).font = { size: 10, name: 'Calibri', color: { argb: 'FF1E293B' } };
    row.height = 18;
  });
  sheet.addRow([]);
}

// ── HELPER: resolve name from app.data ───
function resolveName(d: any): string {
  if (!d) return '—';
  return d.fullName || d.full_name || d.name || d.Name || d.Full_Name || '—';
}

// ── HELPER: send workbook as download ────
async function sendWorkbook(res: Response, workbook: ExcelJS.Workbook, filename: string) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

// ════════════════════════════════════════
// EXPORT 1: All Applications (dynamic cols)
// GET /drives/:driveId/export/applications
// Query: ?status=all|applied|shortlisted|etc
// ════════════════════════════════════════
export const exportApplications = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const status = (req.query.status as string) || 'all';
  const collegeId = req.user?.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const formConfig = await FormFieldModel.findOne({ driveId }).lean();
  const fields = (formConfig?.fields || []) as any[];

  const filter: any = { driveId, collegeId };
  if (status !== 'all') filter.status = status;

  const applications = await ApplicationModel.find(filter).sort({ submittedAt: -1 }).lean() as any[];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CampusPool';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Applications', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  const infoRows = [
    { label: 'Company', value: drive.companyName },
    { label: 'Job Role', value: drive.jobRole },
    { label: 'CTC', value: drive.ctc || '—' },
    { label: 'Filter', value: status.toUpperCase() },
    { label: 'Total Records', value: String(applications.length) },
    { label: 'Generated On', value: new Date().toLocaleString('en-IN') }
  ];
  addInfoHeader(sheet, infoRows);

  // Dynamic columns from form fields (exclude file types)
  const dynamicFields = fields
    .filter((f: any) => f.type !== 'file_pdf' && f.type !== 'file_image')
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Drive ID', key: 'driveStudentId', width: 16 },
    { header: 'Reference', key: 'ref', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Applied On', key: 'appliedOn', width: 16 },
    ...dynamicFields.map((f: any) => ({
      header: f.label,
      key: f.id,
      width: Math.max(15, Math.min((f.label?.length || 8) + 8, 30))
    }))
  ];

  sheet.columns = columns;

  // Add header row
  const headerRow = sheet.addRow(columns.map(c => c.header));
  styleHeaderRow(headerRow);

  // Freeze panes
  const headerRowNumber = infoRows.length + 2; // info rows + blank + header
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber, xSplit: 0 }];

  // Data rows
  applications.forEach((app: any, idx: number) => {
    const rowData: Record<string, any> = {
      sno: idx + 1,
      driveStudentId: app.driveStudentId || '—',
      ref: app.referenceNumber || '—',
      status: (app.status || '—').toUpperCase(),
      appliedOn: fmtDate(app.submittedAt)
    };

    // Resolve dynamic field values
    dynamicFields.forEach((field: any) => {
      const keys = [
        field.label?.replace(/\s+/g, '_'),
        field.label?.toLowerCase().replace(/\s+/g, '_'),
        field.label?.toLowerCase().replace(/\s+/g, ''),
        field.label,
        field.id
      ].filter(Boolean);

      let value: any = '—';
      for (const k of keys) {
        if (app.data?.[k] !== undefined && app.data[k] !== '') {
          value = Array.isArray(app.data[k]) ? app.data[k].join(', ') : String(app.data[k]);
          break;
        }
      }
      rowData[field.id] = value;
    });

    const row = sheet.addRow(columns.map(c => rowData[c.key] ?? ''));
    styleDataRow(row, idx, getStatusColor(app.status));
  });

  // Autofilter on header row
  if (applications.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber + applications.length, column: columns.length }
    };
  }

  const statusLabel = status === 'all' ? 'All' : status;
  const filename = `${drive.companyName}_${statusLabel}_Applications_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});

// ════════════════════════════════════════
// EXPORT 2: Shortlisted Students
// GET /drives/:driveId/export/shortlisted
// ════════════════════════════════════════
export const exportShortlisted = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const collegeId = req.user?.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const applications = await ApplicationModel.find({
    driveId, collegeId, status: 'shortlisted'
  }).sort({ submittedAt: -1 }).lean() as any[];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CampusPool';

  const sheet = workbook.addWorksheet('Shortlisted Students');

  addInfoHeader(sheet, [
    { label: 'Company', value: drive.companyName },
    { label: 'Job Role', value: drive.jobRole },
    { label: 'Shortlisted Count', value: String(applications.length) },
    { label: 'Generated On', value: new Date().toLocaleString('en-IN') }
  ]);

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Drive ID', key: 'driveStudentId', width: 18 },
    { header: 'Full Name', key: 'name', width: 24 },
    { header: 'USN', key: 'usn', width: 16 },
    { header: 'Branch', key: 'branch', width: 12 },
    { header: 'CGPA', key: 'cgpa', width: 8 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Reference', key: 'ref', width: 18 },
  ];
  sheet.columns = columns;

  const headerRow = sheet.addRow(columns.map(c => c.header));
  styleHeaderRow(headerRow);

  applications.forEach((app: any, idx: number) => {
    const d = app.data || {};
    const row = sheet.addRow([
      idx + 1,
      app.driveStudentId || '—',
      resolveName(d),
      d.usn || d.USN || d.roll_no || '—',
      d.branch || d.Branch || '—',
      d.cgpa || d.CGPA || '—',
      d.email || d.Email || '—',
      d.phone || d.Phone || d.contact || '—',
      app.referenceNumber || '—'
    ]);
    styleDataRow(row, idx, COLORS.shortlisted);
  });

  const filename = `${drive.companyName}_Shortlisted_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});

// ════════════════════════════════════════
// EXPORT 3: Attended Students
// GET /drives/:driveId/export/attended
// ════════════════════════════════════════
export const exportAttended = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const collegeId = req.user?.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const applications = await ApplicationModel.find({
    driveId, collegeId,
    status: { $in: ['attended', 'selected', 'shortlisted'] },
    attendedAt: { $exists: true }
  }).sort({ attendedAt: 1 }).lean() as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attended Students');

  addInfoHeader(sheet, [
    { label: 'Company', value: drive.companyName },
    { label: 'Event Date', value: fmtDate(drive.eventDate) },
    { label: 'Attended Count', value: String(applications.length) },
    { label: 'Generated On', value: new Date().toLocaleString('en-IN') }
  ]);

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Drive ID', key: 'driveStudentId', width: 18 },
    { header: 'Full Name', key: 'name', width: 24 },
    { header: 'USN', key: 'usn', width: 16 },
    { header: 'Branch', key: 'branch', width: 12 },
    { header: 'CGPA', key: 'cgpa', width: 8 },
    { header: 'Check-In Time', key: 'checkinTime', width: 20 },
    { header: 'Current Status', key: 'status', width: 16 },
  ];
  sheet.columns = columns;

  const headerRow = sheet.addRow(columns.map(c => c.header));
  styleHeaderRow(headerRow);

  applications.forEach((app: any, idx: number) => {
    const d = app.data || {};
    const row = sheet.addRow([
      idx + 1,
      app.driveStudentId || '—',
      resolveName(d),
      d.usn || d.USN || '—',
      d.branch || d.Branch || '—',
      d.cgpa || d.CGPA || '—',
      app.attendedAt ? new Date(app.attendedAt).toLocaleString('en-IN') : '—',
      (app.status || '—').toUpperCase()
    ]);
    styleDataRow(row, idx, getStatusColor(app.status));
  });

  const filename = `${drive.companyName}_Attended_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});

// ════════════════════════════════════════
// EXPORT 4: Round-specific students
// GET /drives/:driveId/export/round/:roundType
// ════════════════════════════════════════
export const exportRoundStudents = asyncHandler(async (req: Request, res: Response) => {
  const { driveId, roundType } = req.params;
  const collegeId = req.user?.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const rooms = await RoomModel.find({ driveId, round: roundType }).lean() as any[];

  // Map applicationId → room name
  const appRoomMap = new Map<string, string>();
  rooms.forEach((room: any) => {
    (room.assignedStudents || []).forEach((id: any) => {
      appRoomMap.set(id.toString(), room.name);
    });
  });

  const allStudentIds = [...appRoomMap.keys()];

  // Get all students + round results
  const [allApps, passedApps, failedApps] = await Promise.all([
    ApplicationModel.find({ _id: { $in: allStudentIds }, driveId, collegeId }).lean() as any,
    ApplicationModel.find({ driveId, collegeId, status: `${roundType}_passed` }).lean() as any,
    ApplicationModel.find({ driveId, collegeId, status: `${roundType}_failed` }).lean() as any,
  ]);

  const passedIds = new Set(passedApps.map((a: any) => a._id.toString()));
  const failedIds = new Set(failedApps.map((a: any) => a._id.toString()));

  // Merge all unique apps
  const appMap = new Map<string, any>();
  [...allApps, ...passedApps, ...failedApps].forEach((a: any) => {
    appMap.set(a._id.toString(), a);
  });
  const mergedApps = [...appMap.values()];

  const workbook = new ExcelJS.Workbook();
  const roundLabel = roundType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const sheet1 = workbook.addWorksheet(`${roundLabel} - All`);

  addInfoHeader(sheet1, [
    { label: 'Company', value: drive.companyName },
    { label: 'Round', value: roundLabel },
    { label: 'Total Students', value: String(mergedApps.length) },
    { label: 'Passed', value: String(passedApps.length) },
    { label: 'Failed', value: String(failedApps.length) },
  ]);

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Drive ID', key: 'driveStudentId', width: 18 },
    { header: 'Full Name', key: 'name', width: 24 },
    { header: 'USN', key: 'usn', width: 16 },
    { header: 'Branch', key: 'branch', width: 12 },
    { header: 'CGPA', key: 'cgpa', width: 8 },
    { header: 'Room', key: 'room', width: 14 },
    { header: 'Result', key: 'result', width: 12 },
  ];
  sheet1.columns = columns;

  const h1 = sheet1.addRow(columns.map(c => c.header));
  styleHeaderRow(h1);

  mergedApps.forEach((app: any, idx: number) => {
    const d = app.data || {};
    const id = app._id.toString();
    const result = passedIds.has(id) ? 'PASSED' : failedIds.has(id) ? 'FAILED' : 'PENDING';
    const color = result === 'PASSED' ? COLORS.selected : result === 'FAILED' ? COLORS.rejected : COLORS.altRow;

    const row = sheet1.addRow([
      idx + 1,
      app.driveStudentId || '—',
      resolveName(d),
      d.usn || d.USN || '—',
      d.branch || d.Branch || '—',
      d.cgpa || d.CGPA || '—',
      appRoomMap.get(id) || '—',
      result
    ]);
    styleDataRow(row, idx, color);
    row.getCell(8).font = {
      bold: true, size: 10,
      color: { argb: result === 'PASSED' ? 'FF16A34A' : result === 'FAILED' ? 'FFDC2626' : 'FF64748B' }
    };
  });

  // Sheet 2: Passed only
  if (passedApps.length > 0) {
    const sheet2 = workbook.addWorksheet(`${roundLabel} - Passed`);
    sheet2.columns = columns;
    const h2 = sheet2.addRow(columns.map(c => c.header));
    styleHeaderRow(h2);

    passedApps.forEach((app: any, idx: number) => {
      const d = app.data || {};
      const row = sheet2.addRow([
        idx + 1,
        app.driveStudentId || '—',
        resolveName(d),
        d.usn || '—', d.branch || '—', d.cgpa || '—',
        appRoomMap.get(app._id.toString()) || '—',
        'PASSED'
      ]);
      styleDataRow(row, idx, COLORS.selected);
    });
  }

  const filename = `${drive.companyName}_${roundLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});

// ════════════════════════════════════════
// EXPORT 5: Final Selected Students
// GET /drives/:driveId/export/selected
// ════════════════════════════════════════
export const exportSelected = asyncHandler(async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const collegeId = req.user?.collegeId;

  const drive = await DriveModel.findOne({ _id: driveId, collegeId }).lean();
  if (!drive) return res.status(404).json({ success: false, error: 'Drive not found' });

  const applications = await ApplicationModel.find({
    driveId, collegeId, status: 'selected'
  }).sort({ submittedAt: -1 }).lean() as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Selected Students');

  addInfoHeader(sheet, [
    { label: 'Company', value: drive.companyName },
    { label: 'Job Role', value: drive.jobRole },
    { label: 'CTC', value: drive.ctc || '—' },
    { label: 'Selected Count', value: String(applications.length) },
    { label: 'Event Date', value: fmtDate(drive.eventDate) },
    { label: 'Generated On', value: new Date().toLocaleString('en-IN') }
  ]);

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Drive ID', key: 'driveStudentId', width: 18 },
    { header: 'Full Name', key: 'name', width: 26 },
    { header: 'USN', key: 'usn', width: 16 },
    { header: 'Branch', key: 'branch', width: 12 },
    { header: 'CGPA', key: 'cgpa', width: 8 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Reference', key: 'ref', width: 18 },
  ];
  sheet.columns = columns;

  // Gold header for selected
  const headerRow = sheet.addRow(columns.map(c => c.header));
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  applications.forEach((app: any, idx: number) => {
    const d = app.data || {};
    const row = sheet.addRow([
      idx + 1,
      app.driveStudentId || '—',
      resolveName(d),
      d.usn || d.USN || '—',
      d.branch || d.Branch || '—',
      d.cgpa || d.CGPA || '—',
      d.email || d.Email || '—',
      d.phone || d.Phone || '—',
      app.referenceNumber || '—'
    ]);
    styleDataRow(row, idx, 'F0FDF4');
  });

  const filename = `${drive.companyName}_SELECTED_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});

// ════════════════════════════════════════
// EXPORT 6: Analytics Summary
// GET /analytics/export/summary
// ════════════════════════════════════════
export const exportAnalyticsSummary = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = req.user?.collegeId;

  const drives = await DriveModel.find({ collegeId }).sort({ createdAt: -1 }).lean() as any[];
  const college = await CollegeModel.findById(collegeId).lean() as any;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Placement Summary');

  addInfoHeader(sheet, [
    { label: 'College', value: college?.name || '—' },
    { label: 'Total Drives', value: String(drives.length) },
    { label: 'Report Date', value: new Date().toLocaleString('en-IN') }
  ]);

  const columns = [
    { header: '#', key: 'sno', width: 6 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Job Role', key: 'role', width: 22 },
    { header: 'CTC', key: 'ctc', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Event Date', key: 'eventDate', width: 14 },
    { header: 'Applications', key: 'applied', width: 14 },
    { header: 'Shortlisted', key: 'shortlisted', width: 13 },
    { header: 'Attended', key: 'attended', width: 12 },
    { header: 'Selected', key: 'selected', width: 12 },
    { header: 'Conversion %', key: 'conversion', width: 14 },
  ];
  sheet.columns = columns;

  const headerRow = sheet.addRow(columns.map(c => c.header));
  styleHeaderRow(headerRow);

  // Aggregate counts for all drives
  const counts = await ApplicationModel.aggregate([
    { $match: { collegeId: new mongoose.Types.ObjectId(collegeId as string) } },
    { $group: { _id: { driveId: '$driveId', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const countMap = new Map<string, Record<string, number>>();
  counts.forEach(({ _id, count }: any) => {
    const key = _id.driveId.toString();
    if (!countMap.has(key)) countMap.set(key, {});
    countMap.get(key)![_id.status] = count;
  });

  let totalApplied = 0, totalShortlisted = 0, totalAttended = 0, totalSelected = 0;

  drives.forEach((drive: any, idx: number) => {
    const c = countMap.get(drive._id.toString()) || {};
    const applied = Object.values(c).reduce((s: number, v: any) => s + v, 0);
    const shortlisted = c['shortlisted'] || 0;
    const attended = c['attended'] || 0;
    const selected = c['selected'] || 0;
    const conversion = applied > 0 ? ((selected / applied) * 100).toFixed(1) : '0.0';

    totalApplied += applied; totalShortlisted += shortlisted;
    totalAttended += attended; totalSelected += selected;

    const row = sheet.addRow([
      idx + 1, drive.companyName, drive.jobRole, drive.ctc || '—',
      (drive.status || '—').toUpperCase(), fmtDate(drive.eventDate),
      applied, shortlisted, attended, selected, `${conversion}%`
    ]);
    styleDataRow(row, idx);
    if (selected > 0) {
      row.getCell(10).font = { bold: true, size: 10, color: { argb: 'FF16A34A' } };
    }
  });

  // Totals row
  sheet.addRow([]);
  const totalsRow = sheet.addRow([
    '', 'TOTAL', '', '', '', '', totalApplied, totalShortlisted, totalAttended, totalSelected,
    totalApplied > 0 ? `${((totalSelected / totalApplied) * 100).toFixed(1)}%` : '0.0%'
  ]);
  totalsRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  });

  const filename = `CampusPool_Placement_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
  await sendWorkbook(res, workbook, filename);
});
