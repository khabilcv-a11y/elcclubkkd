import { newId } from './db.js';

// Every email is recorded in the outbox. If RESEND_API_KEY is set it is also delivered via Resend (resend.com).
export const mailConfigured = env => !!env.RESEND_API_KEY;

export async function sendMail(db, env, to, subject, body) {
  const ts = new Date().toISOString();
  const save = (status, error) => db.addExtra('outbox', [newId(), ts, to || '', subject, body, status, error || null]);
  if (!to) { save('failed', 'No recipient email on record'); return { status: 'failed', error: 'No recipient email on record' }; }
  if (!env.RESEND_API_KEY) { save('saved'); return { status: 'saved' }; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'ELC Kozhikode <onboarding@resend.dev>', to: [to], subject, text: body }),
    });
    if (!r.ok) throw new Error(`Email service said ${r.status}: ${(await r.text()).slice(0, 200)}`);
    save('sent'); return { status: 'sent' };
  } catch (e) { save('failed', e.message); return { status: 'failed', error: e.message }; }
}
