// ============================================================
// SMS Service — pixdrift Approval Engine
// Supports: 46elks (Swedish primary), Twilio (fallback)
// ============================================================

type SMSResult = {
  success: boolean;
  provider?: string;
  message_id?: string;
  error?: string;
};

// ============================================================
// PRIMARY: 46elks (Swedish, GDPR-friendly, no VAT overhead)
// https://46elks.se — API docs: https://46elks.com/docs
// ============================================================

export async function sendApprovalSMS46elks(
  phone: string,
  token: string,
  workshopName?: string
): Promise<boolean> {
  const apiUsername = process.env.ELKS_API_USERNAME;
  const apiPassword = process.env.ELKS_API_PASSWORD;
  const senderName = process.env.ELKS_SENDER || workshopName?.slice(0, 11) || 'Pixdrift';

  if (!apiUsername || !apiPassword) {
    return false; // Not configured
  }

  const link = `https://pixdrift.com/approve?t=${token}`;
  const message = `${workshopName || 'Verkstad'}: Vi har hittat något på din bil. Se video och godkänn direkt: ${link}`;

  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');

  try {
    const response = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: senderName,
        to: normalizePhone(phone),
        message,
      }).toString(),
    });

    const data = await response.json() as any;

    if (response.ok && data.id) {
      console.log(`[SMS 46elks] Sent to ${maskPhone(phone)}, id: ${data.id}`);
      return true;
    } else {
      console.error('[SMS 46elks] Failed:', data);
      return false;
    }
  } catch (err) {
    console.error('[SMS 46elks] Error:', err);
    return false;
  }
}

// ============================================================
// FALLBACK: Twilio (global reliability)
// ============================================================

export async function sendApprovalSMSTwilio(
  phone: string,
  approvalId: string,
  token: string,
  workshopName?: string
): Promise<boolean> {
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return false; // Not configured
  }

  const link = `https://pixdrift.com/approve?t=${token}`;
  const message = `${workshopName || 'Verkstad'}: Vi har hittat något på din bil som behöver ditt godkännande. Se video och godkänn här: ${link}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const credentials = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_FROM,
        To: normalizePhone(phone),
        Body: message,
      }).toString(),
    });

    const data = await response.json() as any;

    if (response.ok && data.sid) {
      console.log(`[SMS Twilio] Sent to ${maskPhone(phone)}, sid: ${data.sid}`);
      return true;
    } else {
      console.error('[SMS Twilio] Failed:', data.message || data);
      return false;
    }
  } catch (err) {
    console.error('[SMS Twilio] Error:', err);
    return false;
  }
}

// ============================================================
// MAIN: sendApprovalSMS — tries 46elks first, then Twilio, then logs stub
// ============================================================

export async function sendApprovalSMS(
  phone: string,
  approvalId: string,
  token: string,
  workshopName: string
): Promise<boolean> {
  // Try 46elks first (Swedish primary)
  const elksResult = await sendApprovalSMS46elks(phone, token, workshopName);
  if (elksResult) return true;

  // Fallback: Twilio
  const twilioResult = await sendApprovalSMSTwilio(phone, approvalId, token, workshopName);
  if (twilioResult) return true;

  // Dev stub — log to console
  const link = `https://pixdrift.com/approve?t=${token}`;
  const message = `${workshopName}: Vi har hittat något på din bil. Se video och godkänn: ${link}`;
  console.log(`[SMS STUB] ─────────────────────────────`);
  console.log(`[SMS STUB] To:      ${maskPhone(phone)}`);
  console.log(`[SMS STUB] From:    ${workshopName}`);
  console.log(`[SMS STUB] Message: ${message}`);
  console.log(`[SMS STUB] ─────────────────────────────`);
  console.log(`[SMS STUB] Configure ELKS_API_USERNAME/PASSWORD or TWILIO_* to send real SMS`);

  return true; // Return true in dev so flow continues
}

// ============================================================
// REMINDER SMS
// ============================================================

export async function sendReminderSMS(
  phone: string,
  token: string,
  workshopName: string,
  waitMinutes: number
): Promise<boolean> {
  const link = `https://pixdrift.com/approve?t=${token}`;
  const message = `${workshopName}: Vi väntar fortfarande på ditt svar angående din bil. Godkänn eller avböj här: ${link}`;

  // Try 46elks
  const apiUsername = process.env.ELKS_API_USERNAME;
  const apiPassword = process.env.ELKS_API_PASSWORD;

  if (apiUsername && apiPassword) {
    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');
    try {
      const response = await fetch('https://api.46elks.com/a1/sms', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: workshopName.slice(0, 11),
          to: normalizePhone(phone),
          message,
        }).toString(),
      });
      if (response.ok) return true;
    } catch (_) {}
  }

  console.log(`[SMS REMINDER STUB] To: ${maskPhone(phone)} | ${message}`);
  return true;
}

// ============================================================
// UTILS
// ============================================================

function normalizePhone(phone: string): string {
  // Swedish mobile: 070-XXX XX XX → +46701234567
  let normalized = phone.replace(/[\s\-]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+46' + normalized.slice(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

// ============================================================
// GENERIC SMS — for any custom message (missing parts, etc.)
// ============================================================

export async function sendGenericSMS(
  phone: string,
  message: string,
  workshopName?: string
): Promise<boolean> {
  const apiUsername = process.env.ELKS_API_USERNAME;
  const apiPassword = process.env.ELKS_API_PASSWORD;
  const senderName = process.env.ELKS_SENDER || workshopName?.slice(0, 11) || 'Pixdrift';

  if (apiUsername && apiPassword) {
    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');
    try {
      const response = await fetch('https://api.46elks.com/a1/sms', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: senderName,
          to: normalizePhone(phone),
          message,
        }).toString(),
      });
      const data = await response.json() as any;
      if (response.ok && data.id) {
        console.log(`[SMS 46elks Generic] Sent to ${maskPhone(phone)}, id: ${data.id}`);
        return true;
      }
    } catch (err) {
      console.error('[SMS 46elks Generic] Error:', err);
    }
  }

  // Dev stub
  console.log(`[SMS STUB] ─────────────────────────────`);
  console.log(`[SMS STUB] To:      ${maskPhone(phone)}`);
  console.log(`[SMS STUB] From:    ${workshopName || 'Verkstad'}`);
  console.log(`[SMS STUB] Message: ${message}`);
  console.log(`[SMS STUB] ─────────────────────────────`);
  return true; // Always true in dev
}
