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
