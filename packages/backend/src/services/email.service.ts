import nodemailer from 'nodemailer';
import { CollegeModel, ApplicationModel } from '../models';

export async function getTransporter(collegeId: string) {
  const college = await CollegeModel.findById(collegeId).select('smtpConfig');
  if (!college?.smtpConfig) throw new Error('SMTP Config missing for this college');
  
  return nodemailer.createTransport({
    host: college.smtpConfig.host,
    port: college.smtpConfig.port,
    auth: {
      user: college.smtpConfig.user,
      pass: college.smtpConfig.pass
    }
  });
}

export async function sendShortlistEmail(to: string, studentName: string, companyName: string, driveDate: Date, collegeId: string) {
  const transporter = await getTransporter(collegeId);
  const college = await CollegeModel.findById(collegeId).select('name smtpConfig');
  
  const html = `
    <div style="font-family: Arial; padding: 20px;">
      <div style="background: #4F46E5; color: white; padding: 20px; text-align: center;">
        <h2>CampusPool</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${studentName},</p>
        <p>Congratulations! You have been shortlisted for the <strong>${companyName}</strong> campus placement drive.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${driveDate.toLocaleDateString()}</p>
          <p><strong>Venue:</strong> TBD</p>
          <p><strong>Report Time:</strong> TBD</p>
        </div>
        <p>Please carry your college ID and resume.</p>
      </div>
      <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
        <p>${college?.name}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"CampusPool" <${college?.smtpConfig?.user || 'noreply@campuspool.in'}>`,
    to,
    subject: `Congratulations! You're shortlisted for ${companyName} Campus Drive`,
    html
  });
}

export async function sendCongratulationsEmail(to: string, studentName: string, companyName: string, role: string, collegeId: string) {
  const transporter = await getTransporter(collegeId);
  const college = await CollegeModel.findById(collegeId).select('smtpConfig');
  
  const html = `
    <div style="font-family: Arial; padding: 20px; text-align: center;">
      <div style="background: #16a34a; color: white; padding: 30px; border-radius: 12px;">
        <h1>🎉 Congratulations! 🎉</h1>
        <p style="font-size: 18px;">You have been selected by <strong>${companyName}</strong> for the role of <strong>${role}</strong>!</p>
      </div>
      <p style="margin-top: 30px;">HR will contact you within 5 business days with further details.</p>
      <p>Best wishes from the CampusPool Team!</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"CampusPool" <${college?.smtpConfig?.user || 'noreply@campuspool.in'}>`,
    to,
    subject: `🎉 Selected! ${companyName} Offer - CampusPool`,
    html
  });
}

export async function sendMassEmails(applicationIds: string[], type: 'shortlist' | 'offer', collegeId: string, companyName: string = 'Company', role: string = 'Role', driveDate: Date = new Date(), ioCb?: (sent: number) => void) {
  const apps = await ApplicationModel.find({ _id: { $in: applicationIds } });
  let sent = 0;
  let failed = 0;

  for (const app of apps) {
    try {
      const email = app.data?.email || app.data?.email_id || app.data?.['e-mail'];
      const name = app.data?.name || app.data?.fullName || 'Student';
      
      if (!email) { failed++; continue; }

      if (type === 'shortlist') {
        await sendShortlistEmail(email, name, companyName, driveDate, collegeId);
      } else {
        await sendCongratulationsEmail(email, name, companyName, role, collegeId);
      }
      
      sent++;
      if(ioCb) ioCb(sent);
      
      // Delay 1s
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('Email sending failed for an app:', err);
      failed++;
    }
  }
  return { sent, failed };
}

export async function sendDriveIdEmail(
  to: string,
  studentName: string,
  driveStudentId: string,
  companyName: string,
  jobRole: string,
  eventDate: Date | string | null,
  collegeId: string
): Promise<void> {
  const transporter = await getTransporter(collegeId);
  const college = await CollegeModel.findById(collegeId).select('smtpConfig');

  await transporter.sendMail({
    from: `"CampusPool" <${college?.smtpConfig?.user || 'noreply@campuspool.in'}>`,
    to,
    subject: `Your CampusPool Event ID — ${companyName} Drive`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#F8FAFC;padding:32px 16px;">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#4F46E5;color:white;font-size:20px;font-weight:bold;padding:8px 16px;border-radius:8px;display:inline-block;">CampusPool</div>
        </div>
        <h2 style="color:#1E293B;margin:0 0 8px;font-size:20px;">Hi ${studentName}! 👋</h2>
        <p style="color:#64748B;margin:0 0 24px;font-size:15px;">Your application for <strong>${companyName}</strong> (${jobRole}) has been received. Here is your Event Day ID:</p>
        <div style="background:#F0F0FF;border:2px dashed #6366F1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <p style="color:#6366F1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your Drive ID</p>
          <div style="color:#1E293B;font-size:36px;font-weight:900;font-family:monospace;letter-spacing:2px;">${driveStudentId}</div>
          <p style="color:#94A3B8;font-size:12px;margin:8px 0 0;">Save this ID. You will need it to check in on event day.</p>
        </div>
        <div style="background:#F8FAFC;border-radius:8px;padding:16px;margin:0 0 24px;">
          <p style="color:#64748B;font-size:13px;margin:0 0 8px;font-weight:600;">Event Details</p>
          <p style="color:#1E293B;font-size:14px;margin:0 0 4px;">🏢 <strong>${companyName}</strong></p>
          <p style="color:#1E293B;font-size:14px;margin:0 0 4px;">💼 ${jobRole}</p>
          ${eventDate ? `<p style="color:#1E293B;font-size:14px;margin:0;">📅 ${new Date(eventDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
        </div>
        <div style="border-left:3px solid #6366F1;padding-left:16px;margin:0 0 24px;">
          <p style="color:#1E293B;font-size:14px;font-weight:600;margin:0 0 8px;">On Event Day:</p>
          <ol style="color:#64748B;font-size:13px;padding-left:16px;margin:0;line-height:1.8;">
            <li>Arrive at the venue</li>
            <li>Scan the QR code displayed on screen</li>
            <li>Enter your Drive ID: <strong style="color:#4F46E5;">${driveStudentId}</strong></li>
            <li>That's it — you're checked in!</li>
          </ol>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0;">This ID is valid only for this drive and expires after the event. Do not share it with others.</p>
      </div>
    </div>`
  });
}
