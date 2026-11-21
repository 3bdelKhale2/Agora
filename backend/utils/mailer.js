const nodemailer = require('nodemailer');
const crypto = require('crypto');
const VerificationToken = require('../models/verificationTokenModel');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  PORT,
  API_BASE_URL,
} = process.env;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 465),
  secure: Number(SMTP_PORT || 465) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

function getApiBase() {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/+$/, '');
  const p = PORT || 4000;
  return `http://localhost:${p}`;
}

function getFrontendBase() {
  return (FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

async function generateEmailVerificationToken(userId, role = null) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await VerificationToken.create({
    user: userId,
    role: role || undefined,
    token,
    purpose: 'EMAIL_VERIFY',
    expiresAt,
  });
  return token;
}

async function generatePasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await VerificationToken.create({
    user: userId,
    token,
    purpose: 'PASSWORD_RESET',
    expiresAt,
  });
  return token;
}

async function sendVerificationEmail(user, token) {
  const verifyUrl = `${getApiBase()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const mail = {
    from: MAIL_FROM || SMTP_USER,
    to: user.email,
    subject: 'Verify your email',
    text: `Hi ${user.firstName},\n\nPlease verify your email to activate your account:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${user.firstName},</p><p>Please verify your email to activate your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  };
  await transporter.sendMail(mail);
}

async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${getFrontendBase()}/reset-password?token=${encodeURIComponent(token)}`;
  const mail = {
    from: MAIL_FROM || SMTP_USER,
    to: user.email,
    subject: 'Reset your password',
    text: `Hi ${user.firstName},\n\nYou requested a password reset. Open the link to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Hi ${user.firstName},</p><p>You requested a password reset. Open the link to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
  };
  await transporter.sendMail(mail);
}

module.exports = { transporter, generateEmailVerificationToken, sendVerificationEmail, generatePasswordResetToken, sendPasswordResetEmail };