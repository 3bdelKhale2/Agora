const { transporter } = require('./mailer');
const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');

async function sendCancellationEmail(reg, refundAmount) {
  try {
    if (!reg) return;
    if (!reg.event || !reg.user) {
      reg = await Registration.findById(reg._id).populate('event').populate('user');
      if (!reg) return;
    }
    const event = reg.event;
    const user = reg.user || await User.findById(reg.user);
    if (!event || !user) return;
    const email = (reg.snapshot && reg.snapshot.email) || user.email;
    const name = (reg.snapshot && reg.snapshot.name) || user.fullName || 'Attendee';
    if (!email) return;
    const subject = `Cancellation Confirmed - ${event.title}`;
    const lines = [];
    lines.push(`Hello ${name},`);
    lines.push('');
    lines.push(`Your registration for "${event.title}" has been cancelled.`);
    if (refundAmount > 0) {
      lines.push(`A refund of $${refundAmount.toFixed(2)} USD has been credited to your wallet.`);
    } else {
      lines.push('No refund was issued (either no payment was made or cancellation was outside the refund window).');
    }
    if (event.startAt) {
      lines.push(`Event start: ${new Date(event.startAt).toLocaleString()}`);
    }
    lines.push('');
    lines.push('Regards,');
    lines.push('Agora Team');
    const textBody = lines.join('\n');
    const htmlBody = `<p>Hello ${name},</p><p>Your registration for <strong>${event.title}</strong> has been cancelled.</p>` +
      (refundAmount > 0 ? `<p>A refund of <strong>$${refundAmount.toFixed(2)} USD</strong> has been credited to your wallet.</p>` : '<p>No refund was issued (either no payment was made or cancellation was outside the refund window).</p>') +
      (event.startAt ? `<p><strong>Event start:</strong> ${new Date(event.startAt).toLocaleString()}</p>` : '') +
      `<p>Regards,<br/>Agora Team</p>`;
    await transporter.sendMail({
      to: email,
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log('[cancel-email] sent for registration', reg._id.toString());
  } catch (err) {
    console.error('[cancel-email] error', err && err.message);
  }
}

function queueCancellationEmail(reg, refundAmount) {
  try { setImmediate(() => sendCancellationEmail(reg, refundAmount)); } catch (_) {}
}

module.exports = { queueCancellationEmail };