import { Request, Response } from 'express';
import { ApplicationModel, DriveModel, CollegeModel } from '../models';
import { NotificationModel } from '../models/notification.model';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { getIO } from '../socket';
import { sendMassEmails } from '../services/email.service';
import { sendMassWhatsApp } from '../services/whatsapp.service';
import { getTransporter } from '../services/email.service';
import { getClient } from '../services/whatsapp.service';
import { resolveTemplate, buildVarsForStudent } from '../utils/resolve-template';

// Helper for normalize
const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s_-]/g, '');

export const uploadShortlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    let matched = 0;
    let notFound = 0;
    const errors: { row: number, reason: string }[] = [];

    // Find all applications for this drive
    const applications = await ApplicationModel.find({ driveId });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        let rowEmail = '';
        let rowUsn = '';

        Object.keys(row).forEach(k => {
            const keyNorm = normalizeKey(k);
            if (['email', 'emailid', 'e-mail', 'emailaddress'].includes(keyNorm)) rowEmail = String(row[k]).toLowerCase().trim();
            if (['usn', 'rollno', 'regno', 'registrationnumber'].includes(keyNorm)) rowUsn = String(row[k]).toUpperCase().trim();
        });

        if (!rowEmail && !rowUsn) {
            notFound++;
            errors.push({ row: i + 2, reason: 'Missing email or USN in row data' });
            continue;
        }

        const match = applications.find(app => {
            const appEmail = (app.data?.email || app.data?.emailid || app.data?.['e-mail'] || (app as any).candidateEmail || '').toLowerCase().trim();
            const appUsn = (app.data?.usn || app.data?.rollno || '').toUpperCase().trim();
            return (rowEmail && appEmail === rowEmail) || (rowUsn && appUsn === rowUsn);
        });

        if (match) {
            match.status = 'shortlisted';
            await match.save();
            matched++;
        } else {
            notFound++;
            errors.push({ row: i + 2, reason: `No matching application found for USN/Email` });
        }
    }

    res.json({ success: true, data: { matched, notFound, errors } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
};

export const getShortlisted = async (req: Request, res: Response): Promise<void> => {
  try {
    const apps = await ApplicationModel.find({ driveId: req.params.driveId, status: 'shortlisted' }).select('data status candidateEmail createdAt driveStudentId referenceNumber');
    res.json({ success: true, data: apps });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to find shortlisted candidates' });
  }
};

export const massNotify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const { channels } = req.body;
    const userRole = (req as any).user.role;
    const collegeId = (req as any).user.collegeId;

    const drive = await DriveModel.findById(driveId);
    if(!drive) {
        res.status(404).json({ success: false, error: 'Drive not found' });
        return;
    }

    const apps = await ApplicationModel.find({ driveId, status: 'shortlisted' });
    const appIds = apps.map(a => a._id.toString());
    const total = appIds.length;

    if(total === 0) {
        res.status(400).json({ success: false, error: 'No shortlisted candidates' });
        return;
    }

    // Fire async
    (async () => {
        try {
            const io = getIO();
            const updateProgress = (sentCount: number) => {
               io.to(`drive:${driveId}`).emit('notify:progress', { sent: sentCount, total });
            };

            if (channels.includes('email')) {
                await sendMassEmails(appIds, 'shortlist', collegeId, drive.companyName || 'CampusPool', drive.jobRole, drive.eventDate as Date || new Date(), updateProgress);
            }
            if (channels.includes('whatsapp')) {
                await sendMassWhatsApp(appIds, 'shortlist', collegeId, drive.companyName || 'CampusPool', drive.eventDate as Date || new Date(), updateProgress);
            }
        } catch(e) { console.error('Background Notification blast failed', e) }
    })();

    res.json({ success: true, data: { message: 'Notifications queued', total } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to initiate notifications' });
  }
};

export const singleNotify = async (req: Request, res: Response): Promise<void> => {
   // Placeholder implementation per instructions
   res.json({ success: true, data: { message: 'Notified' } });
};

export const exportApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const onlyShortlisted = req.path.includes('/shortlisted');
    const query: any = { driveId };
    if (onlyShortlisted) query.status = 'shortlisted';

    const apps = await ApplicationModel.find(query);
    const drive = await DriveModel.findById(driveId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Applications');

    sheet.columns = [
        { header: 'Ref#', key: 'ref', width: 20 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'USN', key: 'usn', width: 15 },
        { header: 'Branch', key: 'branch', width: 15 },
        { header: 'CGPA', key: 'cgpa', width: 10 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Applied At', key: 'date', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    apps.forEach(app => {
        sheet.addRow({
            ref: (app as any).referenceNumber || '-',
            name: app.data?.name || app.data?.fullName || '-',
            usn: app.data?.usn || '-',
            branch: app.data?.branch || '-',
            cgpa: app.data?.cgpa || '-',
            email: app.data?.email || (app as any).candidateEmail || '-',
            phone: app.data?.phone || '-',
            status: app.status,
            date: new Date((app as any).createdAt || Date.now()).toLocaleString()
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${(drive?.companyName || 'Drive').replace(/\s+/g,'_')}_Applications_${new Date().getTime()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: 'Failed to export' });
  }
};

// ════════════════════════════════════════
// BULK NOTIFY WITH CUSTOM TEMPLATE
// POST /drives/:driveId/notify/bulk
// ════════════════════════════════════════
export const bulkNotifyWithTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const {
      applicationIds,
      channel,
      emailSubject,
      emailTemplate,
      whatsappTemplate
    } = req.body;

    const drive = await DriveModel.findById(driveId).lean();
    if (!drive) {
      res.status(404).json({ success: false, error: 'Drive not found' });
      return;
    }

    const college = await CollegeModel.findById(collegeId).lean() as any;

    // If no specific IDs, send to all shortlisted
    let targetIds: string[] = applicationIds || [];
    if (!targetIds.length) {
      const allShortlisted = await ApplicationModel.find({
        driveId, collegeId, status: 'shortlisted'
      }).select('_id').lean();
      targetIds = allShortlisted.map((a: any) => a._id.toString());
    }

    const total = targetIds.length;
    if (total === 0) {
      res.status(400).json({ success: false, error: 'No students to notify' });
      return;
    }

    // Fire async — non-blocking
    (async () => {
      try {
        const io = getIO();
        let sent = 0;
        let failed = 0;

        // Process in batches of 50
        for (let i = 0; i < targetIds.length; i += 50) {
          const batch = targetIds.slice(i, i + 50);
          const apps = await ApplicationModel.find({ _id: { $in: batch } }).lean() as any[];

          for (const app of apps) {
            const vars = buildVarsForStudent(app, drive, college);
            const studentEmail = vars.email;
            const studentPhone = vars.phone;

            try {
              if ((channel === 'email' || channel === 'both') && studentEmail) {
                const subject = resolveTemplate(emailSubject || 'Campus Drive Notification', vars);
                const html = resolveTemplate(emailTemplate || '', vars);
                const transporter = await getTransporter(collegeId);
                await transporter.sendMail({
                  from: `"CampusPool" <${college?.smtpConfig?.user || 'noreply@campuspool.in'}>`,
                  to: studentEmail,
                  subject,
                  html
                });
              }

              if ((channel === 'whatsapp' || channel === 'both') && studentPhone) {
                const message = resolveTemplate(whatsappTemplate || '', vars);
                try {
                  const { client, from } = await getClient(collegeId);
                  await client.messages.create({
                    body: message,
                    from,
                    to: studentPhone.startsWith('+') ? studentPhone : `+91${studentPhone.replace(/\D/g, '').slice(-10)}`
                  });
                } catch (whatsappErr) {
                  console.warn('WhatsApp send failed, skipping:', whatsappErr);
                }
              }

              sent++;
              await NotificationModel.create({
                collegeId, driveId,
                applicationId: app._id,
                recipientType: 'individual',
                channel: channel || 'email',
                status: 'sent',
                sentAt: new Date()
              });
            } catch (err) {
              failed++;
              await NotificationModel.create({
                collegeId, driveId,
                applicationId: app._id,
                recipientType: 'individual',
                channel: channel || 'email',
                status: 'failed',
                errorMessage: String(err),
                sentAt: new Date()
              });
            }

            io.to(`drive:${driveId}`).emit('notify:progress', {
              sent, total, failed,
              percent: Math.round((sent + failed) / total * 100)
            });

            // Small delay between messages
            await new Promise(r => setTimeout(r, 500));
          }

          // Delay between batches
          if (i + 50 < targetIds.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        io.to(`drive:${driveId}`).emit('notify:progress', {
          sent, total, failed, percent: 100, done: true
        });
      } catch (e) {
        console.error('Background bulk notification failed:', e);
      }
    })();

    res.json({
      success: true,
      data: { message: `Sending to ${total} students`, total }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
};

// ════════════════════════════════════════
// GET AUDIT LOGS (Notifications per Drive)
// GET /drives/:driveId/audit-logs
// ════════════════════════════════════════
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driveId } = req.params;
    const collegeId = (req as any).user?.collegeId;

    const logs = await NotificationModel.find({ driveId, collegeId })
      .sort({ sentAt: -1 })
      .populate('applicationId', 'data candidateEmail referenceNumber')
      .lean();

    res.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
};
