import twilio from 'twilio';

// Environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const sendSMS = async (to: string, body: string): Promise<boolean> => {
  try {
    // If credentials are not set, mock the success to keep the UI robust
    if (!client || !twilioPhoneNumber) {
      console.log(`[Twilio Mock] SMS to ${to}: ${body}`);
      return true;
    }

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to
    });
    
    console.log(`[Twilio SMS] Sent to ${to}. SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`[Twilio SMS Error] Failed to send to ${to}:`, error);
    // Explicitly return true or false based on if we should block, but generally we shouldn't fail the backend process over a dropped text
    return false;
  }
};
