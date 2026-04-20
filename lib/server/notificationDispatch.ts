import nodemailer from 'nodemailer';

type DispatchPayload = {
  kind: 'email' | 'sms';
  recipient: string;
  message: string;
  subject?: string;
  metadata?: Record<string, unknown>;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

async function postWebhook(url: string, payload: DispatchPayload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

async function sendEmailViaSmtp(payload: DispatchPayload) {
  const transporter = getSmtpTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !from) {
    return { delivered: false, reason: 'missing_smtp' as const };
  }

  const subject = payload.subject || 'Neue Benachrichtigung von Umzugsnetz';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#005ea6 0%,#00b67a 100%);color:#ffffff;">
          <div style="font-size:24px;font-weight:800;letter-spacing:-0.03em;">Umzugsnetz</div>
          <div style="margin-top:6px;font-size:13px;opacity:.88;">Automatische Benachrichtigung</div>
        </div>
        <div style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.2;color:#0f172a;">${subject}</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;white-space:pre-line;">${payload.message}</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: payload.recipient,
    subject,
    text: payload.message,
    html,
  });

  return { delivered: true, reason: 'smtp' as const };
}

export async function dispatchNotification(payload: DispatchPayload) {
  if (payload.kind === 'email') {
    const smtpResult = await sendEmailViaSmtp(payload);
    if (smtpResult.delivered) {
      return smtpResult;
    }

    const emailWebhookUrl = process.env.EMAIL_WEBHOOK_URL;
    if (emailWebhookUrl) {
      await postWebhook(emailWebhookUrl, payload);
      return { delivered: true, reason: 'webhook' as const };
    }

    return smtpResult;
  }

  const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!smsWebhookUrl) {
    return { delivered: false, reason: 'missing_webhook' as const };
  }

  await postWebhook(smsWebhookUrl, payload);
  return { delivered: true, reason: 'webhook' as const };
}
