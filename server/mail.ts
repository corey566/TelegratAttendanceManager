import nodemailer from "nodemailer";

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function verifyMailTransport() {
  if (!isSmtpConfigured()) {
    console.warn("[mail] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM to enable email reports.");
    return false;
  }
  try {
    await mailTransporter.verify();
    console.log(`[mail] SMTP ready (host=${process.env.SMTP_HOST}, from=${process.env.SMTP_FROM})`);
    return true;
  } catch (e: any) {
    console.error("[mail] SMTP verification failed:", e?.message || e);
    return false;
  }
}

export async function sendMail({ to, subject, text, html, attachments }: { to: string | string[], subject: string, text?: string, html?: string, attachments?: { filename: string, content: Buffer }[] }) {
  if (!isSmtpConfigured()) {
    const msg = "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM.";
    console.error("[mail]", msg);
    throw new Error(msg);
  }
  if (!process.env.SMTP_FROM) {
    console.warn("[mail] SMTP_FROM is not set; using SMTP_USER as fallback.");
  }
  try {
    const info = await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
      attachments,
    });
    console.log(`[mail] Sent to ${Array.isArray(to) ? to.join(",") : to} (id=${info.messageId})`);
    return info;
  } catch (error: any) {
    console.error(`[mail] Error sending email to ${Array.isArray(to) ? to.join(",") : to}:`, error?.message || error);
    throw error;
  }
}
