import twilio from 'twilio';
import { CollegeModel, ApplicationModel } from '../models';

export async function getClient(collegeId: string) {
  const college = await CollegeModel.findById(collegeId).select('twilioConfig');
  if (!college?.twilioConfig?.accountSid) throw new Error('Twilio config missing for this college');
  
  return {
    client: twilio(college.twilioConfig.accountSid, college.twilioConfig.authToken),
    from: college.twilioConfig.fromNumber
  };
}

export async function sendShortlistWhatsApp(to: string, studentName: string, companyName: string, driveDate: Date, collegeId: string) {
  try {
    const { client, from } = await getClient(collegeId);
    const msg = `Hi ${studentName}! 🎉 Congratulations! You have been shortlisted for ${companyName} campus placement drive on ${driveDate.toLocaleDateString()}. Please carry your college ID and resume.\n- CampusPool`;
    
    await client.messages.create({
      body: msg,
      from,
      to: to.startsWith('+') ? to : `+91${to}` 
    });
  } catch(error) {
    console.warn("Twilio configuration not valid, skipping SMS output.", error);
  }
}

export async function sendCongratulationsWhatsApp(to: string, studentName: string, companyName: string, collegeId: string) {
  try {
    const { client, from } = await getClient(collegeId);
    const msg = `🎊 Congratulations ${studentName}! You have been SELECTED by ${companyName}! HR will contact you soon. Best wishes! - CampusPool`;
    
    await client.messages.create({
      body: msg,
      from,
      to: to.startsWith('+') ? to : `+91${to}`
    });
  } catch(error) {
    console.warn("Twilio configuration not valid, skipping SMS output.", error);
  }
}

export async function sendMassWhatsApp(applicationIds: string[], type: 'shortlist' | 'offer', collegeId: string, companyName: string = 'Company', driveDate: Date = new Date(), ioCb?: (sent: number) => void) {
  const apps = await ApplicationModel.find({ _id: { $in: applicationIds } });
  let sent = 0;
  let failed = 0;

  for (const app of apps) {
    try {
      const phone = app.data?.phone || app.data?.phoneNumber;
      const name = app.data?.name || app.data?.fullName || 'Student';
      
      if (!phone) { failed++; continue; }

      if (type === 'shortlist') {
        await sendShortlistWhatsApp(phone, name, companyName, driveDate, collegeId);
      } else {
        await sendCongratulationsWhatsApp(phone, name, companyName, collegeId);
      }
      
      sent++;
      if(ioCb) ioCb(sent);
      
      // Delay 1s
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('WhatsApp message failed for an app:', err);
      failed++;
    }
  }
  return { sent, failed };
}
