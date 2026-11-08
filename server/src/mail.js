// Outgoing email through Amazon SES. Without SES settings (local development),
// messages are printed to the server log instead of being sent.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from './config.js';

const client = config.mail.region ? new SESv2Client({ region: config.mail.region }) : null;

export async function sendMail(to, subject, text) {
  if (!client || !config.mail.from) { console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`); return; }
  await client.send(new SendEmailCommand({
    FromEmailAddress: config.mail.from,
    Destination: { ToAddresses: [to] },
    Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
  }));
}

export const verifyMail = (name, link) => [
  'Confirm your email — Memorize 114',
  `Assalāmu ʿalaykum ${name},\n\nPlease confirm your email address for Memorize 114:\n${link}\n\nThe link works for 48 hours. If you did not create an account, ignore this message.\n\n— Memorize 114 · ${config.appUrl}`,
];
export const resetMail = (name, link) => [
  'Reset your password — Memorize 114',
  `Assalāmu ʿalaykum ${name},\n\nSomeone asked to reset the password for your Memorize 114 account. To choose a new password, open:\n${link}\n\nThe link works for one hour. If it was not you, ignore this message; your password stays the same.\n\n— Memorize 114 · ${config.appUrl}`,
];
