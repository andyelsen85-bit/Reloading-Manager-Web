import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { emailLogTable, settingsTable } from "@workspace/db";

export async function getSmtpSettings() {
  const rows = await db.select().from(settingsTable);
  return rows[0] ?? null;
}

export async function sendMail(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await getSmtpSettings();
  if (!settings?.smtpEnabled || !settings.smtpHost) {
    return { ok: false, error: "SMTP not configured or disabled" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: (settings.smtpPort ?? 587) === 465,
      auth: settings.smtpUser ? {
        user: settings.smtpUser,
        pass: settings.smtpPass ?? "",
      } : undefined,
    });

    await transporter.sendMail({
      from: settings.smtpFrom ?? settings.smtpUser ?? "noreply@reloading-manager",
      to,
      subject,
      text: body,
      html: `<pre style="font-family:sans-serif">${body}</pre>`,
    });

    await db.insert(emailLogTable).values({ toAddress: to, subject, body, status: "sent" });
    return { ok: true };
  } catch (err: any) {
    const errorMsg = err?.message ?? "Unknown error";
    await db.insert(emailLogTable).values({ toAddress: to, subject, body, status: "failed", error: errorMsg });
    return { ok: false, error: errorMsg };
  }
}
