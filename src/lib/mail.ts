import nodemailer from "nodemailer";

/**
 * Sends real email over SMTP (Gmail app password, Resend, Brevo, SES… anything).
 * Without SMTP_* variables, local development prints the message to the server
 * console instead; production refuses to pretend it sent anything.
 */
export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, text: string, html: string) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Email is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS).");
    console.log(`\n[dev mail] to=${to}\n${subject}\n${text}\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || `Bill Nova <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

const PURPOSE_TEXT: Record<string, string> = {
  signup: "verify your email and finish creating your Bill Nova account",
  login: "sign in to Bill Nova",
  reset: "reset your Bill Nova password",
};

export async function sendOtpMail(to: string, code: string, purpose: string, minutes: number) {
  const what = PURPOSE_TEXT[purpose] ?? "continue";
  const text = `Your Bill Nova verification code is ${code}.\n\nUse it to ${what}. It expires in ${minutes} minutes. If you didn't request this, ignore this email and don't share the code with anyone.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px">
<h2 style="margin:0 0 8px">Bill Nova</h2>
<p>Use this code to ${what}:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>
<p style="color:#666;font-size:13px">It expires in ${minutes} minutes. If you didn't request this, ignore this email and never share the code.</p></div>`;
  await sendMail(to, `${code} is your Bill Nova code`, text, html);
}
