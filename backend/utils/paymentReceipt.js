const { transporter } = require('./mailer');
const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');

function extractPrice(ev) {
  if (!ev) return null;
  if (ev.type === 'TRIP') return ev.tripDetails?.price ?? null;
  if (ev.type === 'WORKSHOP') return ev.workshopDetails?.price ?? ev.price ?? null;
  return null;
}

async function sendReceipt(reg) {
  try {
    if (!reg) return;
    // Refresh with needed refs if missing
    if (!reg.event || !reg.user || !reg.event.title) {
      reg = await Registration.findById(reg._id).populate('event').populate('user');
      if (!reg) return;
    }
    if (reg.receiptSentAt) return; // already sent
    console.log('[receipt] preparing receipt for registration', reg._id.toString());
    const event = reg.event;
    const user = reg.user || await User.findById(reg.user);
    if (!event || !user) return;
    const price = reg.priceSnapshot != null ? reg.priceSnapshot : extractPrice(event) || reg.amountPaid || 0;
    const walletPart = reg.walletDeducted || 0;
    const cardPart = (reg.amountPaid || price) - walletPart;
    const name = (reg.snapshot && reg.snapshot.name) || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Attendee';
    const email = (reg.snapshot && reg.snapshot.email) || user.email;
    if (!email) return;

    const subject = `Registration & Payment Confirmed - ${event.title}`;
    const lines = [];
    lines.push(`Hello ${name},`);
    lines.push('');
    lines.push('Your registration and payment have been confirmed. Here are the details:');
    lines.push(`Event: ${event.title}`);
    if (event.startAt) lines.push(`Starts: ${new Date(event.startAt).toLocaleString()}`);
    lines.push(`Total Paid: $${(reg.amountPaid || price).toFixed(2)} USD`);
    lines.push(`Method: ${reg.paymentMethod}`);
    if (walletPart > 0) lines.push(`Wallet Portion: $${walletPart.toFixed(2)} USD`);
    if (cardPart > 0) lines.push(`Card Portion: $${cardPart.toFixed(2)} USD`);
    lines.push('');
    lines.push('If you have any questions, please reply to this email.');
    lines.push('');
    lines.push('Regards,');
    lines.push('Agora Team');
    const textBody = lines.join('\n');

    const htmlBody = `<p>Hello ${name},</p><p>Your <strong>registration and payment</strong> have been confirmed. Details:</p>` +
      `<ul>` +
      `<li><strong>Event:</strong> ${event.title}</li>` +
      (event.startAt ? `<li><strong>Starts:</strong> ${new Date(event.startAt).toLocaleString()}</li>` : '') +
      `<li><strong>Total Paid:</strong> $${(reg.amountPaid || price).toFixed(2)} USD</li>` +
      `<li><strong>Method:</strong> ${reg.paymentMethod}</li>` +
      (walletPart > 0 ? `<li><strong>Wallet Portion:</strong> $${walletPart.toFixed(2)} USD</li>` : '') +
      (cardPart > 0 ? `<li><strong>Card Portion:</strong> $${cardPart.toFixed(2)} USD</li>` : '') +
      `</ul><p>If you have any questions, please reply to this email.</p><p>Regards,<br/>Agora Team</p>`;

    await transporter.sendMail({
      to: email,
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log('[receipt] sent to', email, 'registration', reg._id.toString());
    reg.receiptSentAt = new Date();
    reg.lastReceiptError = undefined;
    await reg.save();
  } catch (err) {
    console.error('[receipt] send error', err && err.message);
    try {
      if (reg) {
        reg.lastReceiptError = (err && err.message ? err.message.substring(0, 300) : 'Unknown error');
        await reg.save();
      }
    } catch (_) { /* swallow */ }
  }
}

function queuePaymentReceipt(reg) {
  try {
    if (!reg || reg.receiptSentAt) return;
    // Only send for successful paid registrations
    if (reg.paymentStatus !== 'PAID') return;
    setImmediate(() => { sendReceipt(reg); });
  } catch (_) { /* swallow */ }
}

async function resendReceipt(regId) {
  const reg = await Registration.findById(regId);
  if (!reg) throw new Error('Registration not found');
  reg.receiptSentAt = undefined; // allow re-send
  await reg.save();
  queuePaymentReceipt(reg);
  return { queued: true };
}

module.exports = { queuePaymentReceipt, resendReceipt };