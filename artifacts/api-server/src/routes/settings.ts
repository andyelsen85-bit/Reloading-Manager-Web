import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable, emailLogTable } from "@workspace/db";
import type { Settings } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendMail } from "../lib/mailer";

const router = Router();

async function ensureSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length === 0) {
    const [row] = await db.insert(settingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

type RedactedSettings = Omit<Settings, "smtpPass"> & { smtpPassConfigured: boolean };

function redactSettings(row: Settings): RedactedSettings {
  const { smtpPass, ...safe } = row;
  return { ...safe, smtpPassConfigured: smtpPass != null && smtpPass !== "" };
}

router.get("/settings", async (_req, res) => {
  const settings = await ensureSettings();
  res.json(redactSettings(settings));
});

router.patch("/settings", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const settings = await ensureSettings();
  const updates: Record<string, unknown> = {};
  if (body.bulletLowStockThreshold !== undefined) updates.bulletLowStockThreshold = body.bulletLowStockThreshold;
  if (body.powderLowStockThreshold !== undefined) updates.powderLowStockThreshold = body.powderLowStockThreshold;
  if (body.primerLowStockThreshold !== undefined) updates.primerLowStockThreshold = body.primerLowStockThreshold;
  if (body.nextLoadNumber !== undefined) updates.nextLoadNumber = body.nextLoadNumber;
  if (body.logoBase64 !== undefined) updates.logoBase64 = body.logoBase64;
  if (body.backgroundBase64 !== undefined) updates.backgroundBase64 = body.backgroundBase64;
  if (body.smtpHost !== undefined) updates.smtpHost = body.smtpHost;
  if (body.smtpPort !== undefined) updates.smtpPort = body.smtpPort;
  if (body.smtpUser !== undefined) updates.smtpUser = body.smtpUser;
  if (body.smtpPass !== undefined) updates.smtpPass = body.smtpPass;
  if (body.smtpFrom !== undefined) updates.smtpFrom = body.smtpFrom;
  if (body.smtpEnabled !== undefined) updates.smtpEnabled = body.smtpEnabled;
  const [updated] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, settings.id)).returning();
  res.json(redactSettings(updated));
});

router.post("/settings/test-mail", async (req, res) => {
  const userId = (req.session as any).userId;
  const { to } = req.body as { to?: string };
  if (!to) return res.status(400).json({ error: "Missing 'to' address" });

  const result = await sendMail(
    to,
    "Reloading Manager — Test Email",
    `This is a test email sent from Reloading Manager on ${new Date().toLocaleString()}.`
  );

  if (result.ok) {
    return res.json({ ok: true, message: "Test email sent successfully" });
  } else {
    return res.status(500).json({ ok: false, error: result.error });
  }
});

router.get("/settings/mail-history", async (_req, res) => {
  const rows = await db.select().from(emailLogTable).orderBy(desc(emailLogTable.sentAt)).limit(100);
  res.json(rows);
});

export default router;
