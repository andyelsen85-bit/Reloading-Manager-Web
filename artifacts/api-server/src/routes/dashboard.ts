import { Router } from "express";
import { db } from "@workspace/db";
import { cartridgesTable, bulletsTable, powdersTable, primersTable, loadsTable, settingsTable, ammoInventoryTable } from "@workspace/db";
import { desc, isNull } from "drizzle-orm";

const router = Router();

router.get("/dashboard/overview", async (_req, res) => {
  const [cartridges, bullets, powders, primers, loads, settingsRows] = await Promise.all([
    db.select().from(cartridgesTable),
    db.select().from(bulletsTable),
    db.select().from(powdersTable),
    db.select().from(primersTable),
    db.select().from(loadsTable).where(isNull(loadsTable.deletedAt)).orderBy(desc(loadsTable.id)),
    db.select().from(settingsTable),
  ]);

  const settings = settingsRows[0] ?? { bulletLowStockThreshold: 100, powderLowStockThreshold: 500, primerLowStockThreshold: 100 };

  const completedLoads = loads.filter((l) => l.completed).length;
  const firedLoads = loads.filter((l) => l.fired).length;
  const activeLoads = loads.filter((l) => !l.completed).length;

  const lowStockBullets = bullets.filter((b) => b.quantityAvailable < settings.bulletLowStockThreshold);
  const lowStockPowders = powders.filter((p) => p.grainsAvailable < settings.powderLowStockThreshold);
  const lowStockPrimers = primers.filter((p) => p.quantityAvailable < settings.primerLowStockThreshold);

  const recentLoads = loads.slice(0, 5);

  // Ready-to-fire by caliber: completed+unfired loads + ammo inventory remaining
  const ammoInventory = await db.select().from(ammoInventoryTable);

  const readyMap: Record<string, { fromLoads: number; fromBuyIn: number }> = {};

  // Completed but not yet fired loads
  for (const l of loads.filter((l) => l.completed && !l.fired)) {
    if (!readyMap[l.caliber]) readyMap[l.caliber] = { fromLoads: 0, fromBuyIn: 0 };
    readyMap[l.caliber].fromLoads += l.cartridgeQuantityUsed;
  }

  // Ammo inventory remaining (total - fired)
  for (const a of ammoInventory) {
    const remaining = a.countTotal - a.countFired;
    if (remaining > 0) {
      if (!readyMap[a.caliber]) readyMap[a.caliber] = { fromLoads: 0, fromBuyIn: 0 };
      readyMap[a.caliber].fromBuyIn += remaining;
    }
  }

  const readyToFireByCaliber = Object.entries(readyMap)
    .map(([caliber, { fromLoads, fromBuyIn }]) => ({ caliber, fromLoads, fromBuyIn, total: fromLoads + fromBuyIn }))
    .sort((a, b) => a.caliber.localeCompare(b.caliber));

  const totalReadyToFire = readyToFireByCaliber.reduce((sum, c) => sum + c.total, 0);

  res.json({
    cartridgeBatches: cartridges.length,
    bulletTypes: bullets.length,
    powderTypes: powders.length,
    primerTypes: primers.length,
    loadRecords: loads.length,
    completedLoads,
    activeLoads,
    firedLoads,
    lowStockBullets,
    lowStockPowders,
    lowStockPrimers,
    recentLoads,
    totalReadyToFire,
    readyToFireByCaliber,
  });
});

router.get("/dashboard/history", async (req, res) => {
  // Include ALL loads (active + soft-deleted) for history accuracy
  const cartridges = await db.select().from(cartridgesTable);
  const loads = await db.select().from(loadsTable);

  const history = cartridges.map((c) => {
    const related = loads.filter((l) => l.cartridgeId === c.id);
    const activePlusCompleted = related.filter((l) => !l.deletedAt);
    const deletedLoads = related.filter((l) => l.deletedAt);
    const loadsCompleted = activePlusCompleted.filter((l) => l.completed).length;
    const totalRounds = activePlusCompleted.reduce((sum, l) => sum + l.cartridgeQuantityUsed, 0);
    const deletedRounds = deletedLoads.reduce((sum, l) => sum + l.cartridgeQuantityUsed, 0);
    return {
      cartridgeId: c.id,
      caliber: c.caliber,
      manufacturer: c.manufacturer,
      timesFired: c.timesFired,
      loadsCompleted,
      totalRoundsReloaded: totalRounds,
      deletedLoadsCount: deletedLoads.length,
    };
  });

  res.json(history.sort((a, b) => a.caliber.localeCompare(b.caliber)));
});

router.get("/dashboard/export", async (req, res) => {
  const [cartridges, bullets, powders, primers, loads] = await Promise.all([
    db.select().from(cartridgesTable),
    db.select().from(bulletsTable),
    db.select().from(powdersTable),
    db.select().from(primersTable),
    db.select().from(loadsTable),
  ]);

  res.json({ cartridges, bullets, powders, primers, loads });
});

export default router;
