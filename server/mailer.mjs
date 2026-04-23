import nodemailer from "nodemailer";

const SMTP_HOST = String(process.env.SMTP_HOST ?? "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
const SMTP_USER = String(process.env.SMTP_USER ?? "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS ?? "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM ?? SMTP_USER ?? "").trim();

const transporter =
  SMTP_HOST && SMTP_FROM
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;

function renderBaseTemplate({ title, preheader, bodyHtml }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#0A0E1A;font-family:Segoe UI,Arial,sans-serif;color:#E7F7FF;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:linear-gradient(155deg,#0F1B2A 0%,#112B3D 100%);border:1px solid #1A4466;border-radius:16px;padding:28px;">
        <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#64DFFF;font-weight:700;margin-bottom:10px;">Ultima Platform</div>
        <h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;color:#FFFFFF;">${title}</h1>
        <p style="margin:0 0 18px;color:#AFC8DA;font-size:14px;">${preheader}</p>
        ${bodyHtml}
      </div>
      <p style="margin:14px 2px 0;color:#7FA0B8;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;
}

async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log("[mailer] SMTP not configured. Email not sent.", { to, subject });
    return { sent: false };
  }
  await transporter.sendMail({ from: SMTP_FROM, to, subject, html, text });
  return { sent: true };
}

export async function sendPasswordResetEmail({ to, firstName, resetLink }) {
  const safeName = firstName ? ` ${firstName}` : "";
  const subject = "Reset your ULTIMA password";
  const html = renderBaseTemplate({
    title: "Password Reset Request",
    preheader: "A secure link was generated to reset your password.",
    bodyHtml: `
      <p style="margin:0 0 18px;color:#D7E8F4;">Hi${safeName}, click the button below to set a new password.</p>
      <a href="${resetLink}" style="display:inline-block;background:#00E5FF;color:#032333;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Reset Password</a>
      <p style="margin:18px 0 0;color:#AFC8DA;font-size:12px;word-break:break-all;">${resetLink}</p>
    `,
  });
  const text = `Hi${safeName},\n\nReset your password using this link:\n${resetLink}\n\nIf you did not request this, ignore this email.`;
  return sendMail({ to, subject, html, text });
}

export async function sendVerificationEmail({ to, firstName, verifyLink }) {
  const safeName = firstName ? ` ${firstName}` : "";
  const subject = "Verify your ULTIMA email";
  const html = renderBaseTemplate({
    title: "Verify Your Email Address",
    preheader: "Please confirm your email to fully activate your account.",
    bodyHtml: `
      <p style="margin:0 0 18px;color:#D7E8F4;">Welcome${safeName}! Click below to verify your email.</p>
      <a href="${verifyLink}" style="display:inline-block;background:#00E5FF;color:#032333;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Verify Email</a>
      <p style="margin:18px 0 0;color:#AFC8DA;font-size:12px;word-break:break-all;">${verifyLink}</p>
    `,
  });
  const text = `Welcome${safeName},\n\nVerify your email using this link:\n${verifyLink}\n\nIf you did not create this account, ignore this email.`;
  return sendMail({ to, subject, html, text });
}

export async function sendPasswordResetCodeEmail({ to, firstName, code, resetLink = null }) {
  const safeName = firstName ? ` ${firstName}` : "";
  const subject = "Your ULTIMA password reset code";
  const html = renderBaseTemplate({
    title: "Password Reset Code",
    preheader: "Use this one-time code to reset your password.",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#D7E8F4;">Hi${safeName}, use this code to reset your password:</p>
      <div style="display:inline-block;background:#071827;border:1px solid #1A4466;border-radius:12px;padding:12px 16px;margin-bottom:12px;">
        <span style="font-size:30px;letter-spacing:6px;font-weight:800;color:#00E5FF;">${code}</span>
      </div>
      <p style="margin:0 0 12px;color:#AFC8DA;font-size:13px;">This code expires in 20 minutes and can be used once.</p>
      ${
        resetLink
          ? `<p style="margin:0 0 8px;color:#AFC8DA;font-size:12px;">Optional link:</p>
             <a href="${resetLink}" style="display:inline-block;background:#00E5FF;color:#032333;text-decoration:none;font-weight:700;padding:10px 14px;border-radius:10px;">Open Reset Page</a>
             <p style="margin:12px 0 0;color:#AFC8DA;font-size:12px;word-break:break-all;">${resetLink}</p>`
          : ""
      }
    `,
  });
  const text = `Hi${safeName},\n\nYour password reset code is: ${code}\nIt expires in 20 minutes.\n${resetLink ? `\nOptional link: ${resetLink}\n` : ""}\nIf you did not request this, ignore this email.`;
  return sendMail({ to, subject, html, text });
}

export async function sendVerificationCodeEmail({ to, firstName, code, verifyLink = null }) {
  const safeName = firstName ? ` ${firstName}` : "";
  const subject = "Your ULTIMA email verification code";
  const html = renderBaseTemplate({
    title: "Email Verification Code",
    preheader: "Use this one-time code to verify your account.",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#D7E8F4;">Welcome${safeName}, enter this code in the app:</p>
      <div style="display:inline-block;background:#071827;border:1px solid #1A4466;border-radius:12px;padding:12px 16px;margin-bottom:12px;">
        <span style="font-size:30px;letter-spacing:6px;font-weight:800;color:#00E5FF;">${code}</span>
      </div>
      <p style="margin:0 0 12px;color:#AFC8DA;font-size:13px;">This code expires in 24 hours and can be used once.</p>
      ${
        verifyLink
          ? `<p style="margin:0 0 8px;color:#AFC8DA;font-size:12px;">Optional link:</p>
             <a href="${verifyLink}" style="display:inline-block;background:#00E5FF;color:#032333;text-decoration:none;font-weight:700;padding:10px 14px;border-radius:10px;">Verify with Link</a>
             <p style="margin:12px 0 0;color:#AFC8DA;font-size:12px;word-break:break-all;">${verifyLink}</p>`
          : ""
      }
    `,
  });
  const text = `Welcome${safeName},\n\nYour email verification code is: ${code}\nIt expires in 24 hours.\n${verifyLink ? `\nOptional link: ${verifyLink}\n` : ""}\nIf you did not create this account, ignore this email.`;
  return sendMail({ to, subject, html, text });
}

export function isMailerConfigured() {
  return Boolean(transporter);
}
