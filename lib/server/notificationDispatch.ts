type DispatchPayload = {
  kind: 'email' | 'sms';
  recipient: string;
  message: string;
  subject?: string;
  metadata?: Record<string, unknown>;
};

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

export async function dispatchNotification(payload: DispatchPayload) {
  const webhookUrl = payload.kind === 'email'
    ? process.env.EMAIL_WEBHOOK_URL
    : process.env.SMS_WEBHOOK_URL;

  if (!webhookUrl) {
    return { delivered: false, reason: 'missing_webhook' as const };
  }

  await postWebhook(webhookUrl, payload);
  return { delivered: true, reason: 'webhook' as const };
}
