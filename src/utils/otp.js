const nodemailer = require('nodemailer');

/**
 * Generate a random 4-digit OTP string.
 */
function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Send OTP to user's email via SMTP.
 */
async function sendOTPEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"BusLink" <noreply@buslink.app>',
    to: email,
    subject: 'BusLink — Your Verification Code',
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;">
        <h2 style="color: #1A73E8;">BusLink Verification</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1A73E8; text-align: center; margin: 24px 0;">${otp}</p>
        <p style="color: #666;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

module.exports = { generateOTP, sendOTPEmail };
