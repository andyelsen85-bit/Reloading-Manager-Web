import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function ensureSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length === 0) {
    const [row] = await db.insert(settingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

router.get("/settings", async (_req, res) => {
  const settings = await ensureSettings();
  res.json(settings);
});

router.patch("/settings", async (req, res) => {
  const body = UpdateSettingsBody.parse(req.body);
  const settings = await ensureSettings();
  const updates: Record<string, unknown> = {};
  if (body.bulletLowStockThreshold !== undefined) updates.bulletLowStockThreshold = body.bulletLowStockThreshold;
  if (body.powderLowStockThreshold !== undefined) updates.powderLowStockThreshold = body.powderLowStockThreshold;
  if (body.primerLowStockThreshold !== undefined) updates.primerLowStockThreshold = body.primerLowStockThreshold;
  if (body.nextLoadNumber !== undefined) updates.nextLoadNumber = body.nextLoadNumber;
  if (body.logoBase64 !== undefined) updates.logoBase64 = body.logoBase64;
  if (body.backgroundBase64 !== undefined) updates.backgroundBase64 = body.backgroundBase64;
  const { eq } = await import("drizzle-orm");
  const [updated] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, settings.id)).returning();
  res.json(updated);
});

export default router;
