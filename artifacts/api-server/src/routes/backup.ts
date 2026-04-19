import { Router } from "express";
import { db } from "@workspace/db";
import {
  cartridgesTable,
  bulletsTable,
  powdersTable,
  primersTable,
  loadsTable,
  settingsTable,
  referenceDataTable,
  chargeLaddersTable,
  chargeLevelsTable,
} from "@workspace/db";

const router = Router();

router.get("/backup", async (_req, res) => {
  const [cartridges, bullets, powders, primers, loads, settings, referenceData, chargeLadders, chargeLevels] = await Promise.all([
    db.select().from(cartridgesTable),
    db.select().from(bulletsTable),
    db.select().from(powdersTable),
    db.select().from(primersTable),
    db.select().from(loadsTable),
    db.select().from(settingsTable),
    db.select().from(referenceDataTable),
    db.select().from(chargeLaddersTable),
    db.select().from(chargeLevelsTable),
  ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    cartridges,
    bullets,
    powders,
    primers,
    loads,
    settings,
    referenceData,
    chargeLadders,
    chargeLevels,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="reloading-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(backup);
});

router.post("/restore", async (req, res) => {
  const data = req.body as Record<string, unknown>;

  if (!data || typeof data !== "object" || !("version" in data)) {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  try {
    await db.transaction(async (tx) => {
      if (Array.isArray(data.loads) && data.loads.length > 0) {
        await tx.delete(loadsTable);
        await tx.insert(loadsTable).values(data.loads as any[]);
      }
      if (Array.isArray(data.cartridges) && data.cartridges.length > 0) {
        await tx.delete(cartridgesTable);
        await tx.insert(cartridgesTable).values(data.cartridges as any[]);
      }
      if (Array.isArray(data.bullets) && data.bullets.length > 0) {
        await tx.delete(bulletsTable);
        await tx.insert(bulletsTable).values(data.bullets as any[]);
      }
      if (Array.isArray(data.powders) && data.powders.length > 0) {
        await tx.delete(powdersTable);
        await tx.insert(powdersTable).values(data.powders as any[]);
      }
      if (Array.isArray(data.primers) && data.primers.length > 0) {
        await tx.delete(primersTable);
        await tx.insert(primersTable).values(data.primers as any[]);
      }
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        await tx.delete(settingsTable);
        await tx.insert(settingsTable).values(data.settings as any[]);
      }
    });

    res.json({ ok: true, message: "Restore complete" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Restore failed" });
  }
});

export default router;
