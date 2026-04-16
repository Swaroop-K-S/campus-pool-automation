import { Request, Response } from 'express';
import { ApplicationModel, DriveModel } from '../models';
import { logAuditEvent } from '../services/audit.service';

// GET /api/v1/drives/:driveId/noc/:appId
// Streams a formatted HTML document suitable for printing as a NOC PDF
export const generateNOC = async (req: Request, res: Response) => {
  try {
    const { driveId, appId } = req.params;
    const collegeId = (req as any).user?.collegeId;

    const [app, drive] = await Promise.all([
      ApplicationModel.findOne({ _id: appId, driveId, collegeId }).lean(),
      DriveModel.findOne({ _id: driveId, collegeId }).lean()
    ]);

    if (!app || !drive) {
      return res.status(404).json({ success: false, error: 'Application or Drive not found' });
    }

    if ((app as any).status !== 'selected') {
      return res.status(400).json({ success: false, error: 'NOC can only be generated for selected candidates' });
    }

    const data = (app as any).data || {};
    const studentName = data.field_name || data.name || data.Name || 'N/A';
    const usn = data.field_usn || data.usn || data.USN || 'N/A';
    const branch = data.field_branch || data.branch || data.Branch || 'N/A';
    const driveStudentId = (app as any).driveStudentId || '—';
    const referenceNumber = (app as any).referenceNumber || '—';

    const eventDate = (drive as any).eventDate
      ? new Date((drive as any).eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    await logAuditEvent({
      userId: (req as any).user.userId,
      action: 'GENERATE_NOC',
      resourceType: 'Application',
      resourceId: appId,
      details: `NOC generated for ${studentName} (${usn}) — ${(drive as any).companyName} — Drive ${driveId}`,
      ipAddress: req.ip || req.socket.remoteAddress
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NOC — ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 14px; color: #111; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 60px 70px; min-height: 100vh; position: relative; }
    .letterhead { text-align: center; border-bottom: 3px solid #1a237e; padding-bottom: 20px; margin-bottom: 30px; }
    .college-name { font-size: 26px; font-weight: bold; color: #1a237e; letter-spacing: 1px; text-transform: uppercase; }
    .college-sub { font-size: 13px; color: #444; margin-top: 4px; }
    .noc-label { font-size: 18px; font-weight: bold; text-align: center; margin: 24px 0; letter-spacing: 2px; text-decoration: underline; text-underline-offset: 4px; }
    .ref-row { display: flex; justify-content: space-between; font-size: 12px; color: #555; margin-bottom: 24px; }
    .body p { margin-bottom: 14px; line-height: 1.8; text-align: justify; }
    .body strong { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th, td { padding: 9px 14px; border: 1px solid #ccc; }
    th { background: #f0f4ff; font-weight: bold; color: #1a237e; text-align: left; width: 40%; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .sig-item { text-align: center; }
    .sig-item .line { width: 160px; border-top: 1.5px solid #333; margin: 0 auto 6px; }
    .sig-item .label { font-size: 12px; font-weight: bold; color: #333; }
    .stamp-box { position: absolute; bottom: 100px; right: 70px; width: 120px; height: 120px; border: 2px dashed #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 11px; text-align: center; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="letterhead">
      <div class="college-name">CampusPool University</div>
      <div class="college-sub">Placement Cell — Department of Training & Placement</div>
      <div class="college-sub">Email: placements@campuspool.edu &nbsp;|&nbsp; Phone: +91-80-XXXX-XXXX</div>
    </div>

    <div class="noc-label">NO OBJECTION CERTIFICATE</div>

    <div class="ref-row">
      <span>Ref No: CP/${driveStudentId}</span>
      <span>Date: ${todayDate}</span>
    </div>

    <div class="body">
      <p>To Whomsoever It May Concern,</p>

      <p>
        This is to certify that <strong>${studentName}</strong>, having University Seat Number (USN) <strong>${usn}</strong>,
        studying in the final year of <strong>${branch}</strong> at CampusPool University, has participated in and has been
        <strong>selected</strong> in the campus placement drive organised by the Placement Cell.
      </p>

      <table>
        <thead>
          <tr><th>Field</th><th>Details</th></tr>
        </thead>
        <tbody>
          <tr><td>Student Name</td><td>${studentName}</td></tr>
          <tr><td>USN / Roll No.</td><td>${usn}</td></tr>
          <tr><td>Branch</td><td>${branch}</td></tr>
          <tr><td>Recruiting Company</td><td>${(drive as any).companyName}</td></tr>
          <tr><td>Job Role / Designation</td><td>${(drive as any).jobRole || 'N/A'}</td></tr>
          <tr><td>Offered CTC</td><td>${(drive as any).ctc || 'N/A'}</td></tr>
          <tr><td>Drive / Event Date</td><td>${eventDate}</td></tr>
          <tr><td>Reference Number</td><td>${referenceNumber}</td></tr>
        </tbody>
      </table>

      <p>
        The university has no objection to the above-named student joining <strong>${(drive as any).companyName}</strong> upon successful completion
        of their academic programme. This certificate is issued in good faith for the purpose of employment formalities.
      </p>

      <p>
        We wish the student the very best in their professional career.
      </p>
    </div>

    <div class="signature-block">
      <div class="sig-item">
        <div class="line"></div>
        <div class="label">Training & Placement Officer</div>
      </div>
      <div class="sig-item">
        <div class="line"></div>
        <div class="label">Head of Department</div>
      </div>
      <div class="sig-item">
        <div class="line"></div>
        <div class="label">Principal / Registrar</div>
      </div>
    </div>

    <div class="stamp-box">OFFICIAL<br/>SEAL</div>

    <div class="footer">
      This is a system-generated document from CampusPool — Placement Management System. &nbsp;|&nbsp; Generated on ${todayDate}
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="NOC_${studentName.replace(/\s+/g, '_')}.html"`);
    return res.send(html);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};
