const { transporter } = require('./mailer');
const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');

async function sendConfirmation(reg) {
  try {
    if (!reg) return;
    if (!reg.event || !reg.user || !reg.event.title) {
      reg = await Registration.findById(reg._id).populate('event').populate('user');
      if (!reg) return;
    }
    if (reg.confirmationSentAt) return;
    const event = reg.event;
    const user = reg.user || await User.findById(reg.user);
    if (!event || !user) return;
    const email = (reg.snapshot && reg.snapshot.email) || user.email;
    const name = (reg.snapshot && reg.snapshot.name) || user.fullName || 'Attendee';
    if (!email) return;
    const subject = `Registration Confirmed - ${event.title}`;
    const lines = [];
    lines.push(`Hello ${name},`);
    lines.push('');
    lines.push(`You have successfully registered for: ${event.title}`);
    if (event.startAt) lines.push(`Start: ${new Date(event.startAt).toLocaleString()}`);
    lines.push('');
    lines.push('If this event requires payment, please proceed to complete payment to secure your spot.');
    lines.push('You will receive a separate payment receipt email once payment is confirmed.');
    lines.push('');
    lines.push('Regards,');
    lines.push('Agora Team');
    const textBody = lines.join('\n');
    const htmlBody = `<p>Hello ${name},</p><p>You have successfully registered for: <strong>${event.title}</strong></p>` +
      (event.startAt ? `<p><strong>Start:</strong> ${new Date(event.startAt).toLocaleString()}</p>` : '') +
      `<p>If this event requires payment, please complete payment to secure your spot.</p>` +
      `<p>You will receive a separate payment receipt email once payment is confirmed.</p>` +
      `<p>Regards,<br/>Agora Team</p>`;
    await transporter.sendMail({
      to: email,
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      subject,
      text: textBody,
      html: htmlBody,
    });
    reg.confirmationSentAt = new Date();
    reg.lastConfirmationError = undefined;
    await reg.save();
    console.log('[confirm] registration confirmation sent for', reg._id.toString());
  } catch (err) {
    console.error('[confirm] send error', err && err.message);
    try {
      if (reg) {
        reg.lastConfirmationError = (err && err.message ? err.message.substring(0, 300) : 'Unknown error');
        await reg.save();
      }
    } catch (_) {}
  }
}

function queueRegistrationConfirmation(reg) {
  try {
    if (!reg || reg.confirmationSentAt) return;
    setImmediate(() => sendConfirmation(reg));
  } catch (_) {}
}

async function resendRegistrationConfirmation(regId) {
  const reg = await Registration.findById(regId);
  if (!reg) throw new Error('Registration not found');
  reg.confirmationSentAt = undefined;
  await reg.save();
  queueRegistrationConfirmation(reg);
  return { queued: true };
}

module.exports = { queueRegistrationConfirmation, resendRegistrationConfirmation };