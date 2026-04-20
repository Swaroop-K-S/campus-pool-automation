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

// GET /api/v1/drives/:driveId/offer/:appId
// Streams a formatted HTML document suitable for printing as an Offer/Selection Letter PDF
export const generateOfferLetter = async (req: Request, res: Response) => {
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
      return res.status(400).json({ success: false, error: 'Offer Letter can only be generated for selected candidates' });
    }

    const data = (app as any).data || {};
    const studentName = data.field_name || data.name || data.Name || 'N/A';
    const usn = data.field_usn || data.usn || data.USN || 'N/A';
    const branch = data.field_branch || data.branch || data.Branch || 'N/A';
    const driveStudentId = (app as any).driveStudentId || '—';

    const eventDate = (drive as any).eventDate
      ? new Date((drive as any).eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    await logAuditEvent({
      userId: (req as any).user.userId,
      action: 'GENERATE_OFFER',
      resourceType: 'Application',
      resourceId: appId,
      details: `Offer Letter generated for ${studentName} (${usn}) — ${(drive as any).companyName} — Drive ${driveId}`,
      ipAddress: req.ip || req.socket.remoteAddress
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offer Letter — ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 15px; color: #111; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 60px 70px; min-height: 100vh; position: relative; }
    .header { text-align: center; margin-bottom: 40px; }
    .company-name { font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; }
    .company-sub { font-size: 14px; color: #444; margin-top: 8px; }
    .hr-line { border-bottom: 2px solid #0f172a; margin: 20px 0 40px 0; }
    .date-row { text-align: right; margin-bottom: 30px; font-weight: bold; }
    .salutation { margin-bottom: 20px; font-size: 16px; }
    .body-block p { margin-bottom: 18px; line-height: 1.8; text-align: justify; }
    .highlight { font-weight: bold; color: #000; }
    .details-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; margin: 30px 0; border-radius: 8px; }
    .details-box table { width: 100%; border-collapse: collapse; }
    .details-box td { padding: 8px 0; vertical-align: top; }
    .details-box td:first-child { font-weight: bold; width: 40%; color: #334155; }
    .signature-block { margin-top: 80px; }
    .sig-line { width: 200px; border-top: 1px solid #333; margin-bottom: 8px; }
    .sig-title { font-weight: bold; color: #333; }
    .sig-sub { font-size: 13px; color: #555; }
    .footer { position: absolute; bottom: 40px; left: 70px; right: 70px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-name">\${(drive as any).companyName}</div>
      <div class="company-sub">Human Resources Department &nbsp;|&nbsp; Campus Selection Program</div>
    </div>
    <div class="hr-line"></div>

    <div class="date-row">Date: \${todayDate}</div>

    <div class="salutation">Dear <strong>\${studentName}</strong>,</div>

    <div class="body-block">
      <p>
        Congratulations! Following your recent participation in the campus recruitment drive held on <span class="highlight">${eventDate}</span> at CampusPool University, we are delighted to inform you that you have successfully cleared all our selection rounds.
      </p>
      <p>
        We are extremely pleased with your profile and it is our pleasure to offer you a position with <span class="highlight">${(drive as any).companyName}</span>. 
      </p>

      <div class="details-box">
        <table>
          <tbody>
            <tr><td>Candidate Name:</td><td>${studentName}</td></tr>
            <tr><td>USN / Roll No:</td><td>${usn}</td></tr>
            <tr><td>University:</td><td>CampusPool University</td></tr>
            <tr><td>Offered Designation:</td><td>${(drive as any).jobRole || 'Trainee / Associate'}</td></tr>
            <tr><td>CTC Offered:</td><td>${(drive as any).ctc || 'As per industry standards'}</td></tr>
            <tr><td>Campus Reference ID:</td><td>CP/${driveStudentId}</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        A formal Letter of Appointment outlining your compensation, benefits, terms of employment, and date of joining will be issued to you shortly before your onboarding date. Please note that this offer is contingent upon your successful graduation and completion of all academic requirements with no active backlogs.
      </p>
      <p>
        We are excited about the prospect of you joining our team and look forward to a mutually rewarding association.
      </p>
      <p>
        Welcome aboard!
      </p>
    </div>

    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-title">Authorized Signatory</div>
      <div class="sig-sub">Talent Acquisition Team</div>
      <div class="sig-sub">${(drive as any).companyName}</div>
    </div>

    <div class="footer">
      This is an electronically generated selection letter for CampusPool placement tracking purposes.
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="Offer_${studentName.replace(/\s+/g, '_')}.html"`);
    return res.send(html);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
};

