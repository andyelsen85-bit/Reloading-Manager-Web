import { Router } from "express";
import { db } from "@workspace/db";
import { loadsTable, cartridgesTable, bulletsTable, powdersTable, primersTable, settingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateLoadBody,
  UpdateLoadBody,
  GetLoadParams,
  UpdateLoadParams,
  DeleteLoadParams,
  CompleteLoadParams,
  FireLoadParams,
  FireLoadBody,
} from "@workspace/api-zod";

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length === 0) {
    const [row] = await db.insert(settingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

const router = Router();

router.get("/loads", async (_req, res) => {
  const rows = await db.select().from(loadsTable).orderBy(desc(loadsTable.id));
  res.json(rows);
});

router.post("/loads", async (req, res) => {
  const body = CreateLoadBody.parse(req.body);
  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, body.cartridgeId));
  if (!cartridge) return res.status(404).json({ error: "Cartridge not found" });

  const settings = await getOrCreateSettings();
  const loadNumber = settings.nextLoadNumber;
  await db.update(settingsTable).set({ nextLoadNumber: loadNumber + 1 }).where(eq(settingsTable.id, settings.id));

  const today = new Date().toISOString().split("T")[0];
  const [row] = await db.insert(loadsTable).values({
    loadNumber,
    cartridgeId: body.cartridgeId,
    cartridgeProductionCharge: cartridge.productionCharge,
    reloadingCycle: cartridge.timesFired + 1,
    date: today,
    caliber: cartridge.caliber,
    cartridgeQuantityUsed: body.cartridgeQuantityUsed,
    notes: body.notes ?? null,
    completed: false,
    fired: false,
  }).returning();
  res.status(201).json(row);
});

router.get("/loads/:id", async (req, res) => {
  const { id } = GetLoadParams.parse({ id: Number(req.params.id) });
  const [row] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.patch("/loads/:id", async (req, res) => {
  const { id } = UpdateLoadParams.parse({ id: Number(req.params.id) });
  const body = UpdateLoadBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.primerId !== undefined) updates.primerId = body.primerId;
  if (body.primerQuantityUsed !== undefined) updates.primerQuantityUsed = body.primerQuantityUsed;
  if (body.powderId !== undefined) updates.powderId = body.powderId;
  if (body.powderChargeGr !== undefined) updates.powderChargeGr = body.powderChargeGr;
  if (body.powderChargeGr !== undefined && body.powderChargeGr != null) {
    const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
    if (load) updates.powderTotalUsedGr = body.powderChargeGr * load.cartridgeQuantityUsed;
  }
  if (body.bulletId !== undefined) updates.bulletId = body.bulletId;
  if (body.bulletQuantityUsed !== undefined) updates.bulletQuantityUsed = body.bulletQuantityUsed;
  if (body.coalIn !== undefined) updates.coalIn = body.coalIn;
  if (body.oalIn !== undefined) updates.oalIn = body.oalIn;
  if (body.l6In !== undefined) updates.l6In = body.l6In;
  if (body.washingMinutes !== undefined) updates.washingMinutes = body.washingMinutes;
  if (body.annealingMinutes !== undefined) updates.annealingMinutes = body.annealingMinutes;
  if (body.secondWashingMinutes !== undefined) updates.secondWashingMinutes = body.secondWashingMinutes;
  if (body.calibrationType !== undefined) updates.calibrationType = body.calibrationType;
  if (body.skippedSteps !== undefined) updates.skippedSteps = body.skippedSteps;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  if (body.notes !== undefined) updates.notes = body.notes;
  const [row] = await db.update(loadsTable).set(updates).where(eq(loadsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/loads/:id", async (req, res) => {
  const { id } = DeleteLoadParams.parse({ id: Number(req.params.id) });
  await db.delete(loadsTable).where(eq(loadsTable.id, id));
  res.status(204).send();
});

router.post("/loads/:id/complete", async (req, res) => {
  const { id } = CompleteLoadParams.parse({ id: Number(req.params.id) });
  const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!load) return res.status(404).json({ error: "Not found" });
  if (load.completed) return res.status(400).json({ error: "Already completed" });

  const skipped: string[] = load.skippedSteps ? JSON.parse(load.skippedSteps) : [];
  const primerDone = load.primerId != null || skipped.includes("priming");
  const powderDone = load.powderId != null || skipped.includes("powder");
  const bulletDone = (load.bulletId != null && load.coalIn != null && load.oalIn != null) || skipped.includes("bullet_seating");

  if (!primerDone || !powderDone || !bulletDone) {
    return res.status(400).json({ error: "Missing required steps: primer, powder, bullet seating (or skip them)" });
  }

  if (load.primerId && !skipped.includes("priming")) {
    const [primer] = await db.select().from(primersTable).where(eq(primersTable.id, load.primerId));
    if (primer) {
      await db.update(primersTable).set({
        quantityAvailable: Math.max(0, primer.quantityAvailable - (load.primerQuantityUsed ?? load.cartridgeQuantityUsed))
      }).where(eq(primersTable.id, primer.id));
    }
  }

  if (load.powderId && !skipped.includes("powder")) {
    const [powder] = await db.select().from(powdersTable).where(eq(powdersTable.id, load.powderId));
    if (powder) {
      await db.update(powdersTable).set({
        grainsAvailable: Math.max(0, powder.grainsAvailable - (load.powderTotalUsedGr ?? 0))
      }).where(eq(powdersTable.id, powder.id));
    }
  }

  if (load.bulletId && !skipped.includes("bullet_seating")) {
    const [bullet] = await db.select().from(bulletsTable).where(eq(bulletsTable.id, load.bulletId));
    if (bullet) {
      await db.update(bulletsTable).set({
        quantityAvailable: Math.max(0, bullet.quantityAvailable - (load.bulletQuantityUsed ?? load.cartridgeQuantityUsed))
      }).where(eq(bulletsTable.id, bullet.id));
    }
  }

  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
  if (cartridge) {
    await db.update(cartridgesTable).set({
      quantityLoaded: cartridge.quantityLoaded + load.cartridgeQuantityUsed,
      currentStep: "Completed",
    }).where(eq(cartridgesTable.id, cartridge.id));
  }

  const [updated] = await db.update(loadsTable).set({ completed: true }).where(eq(loadsTable.id, id)).returning();
  res.json(updated);
});

router.post("/loads/:id/fire", async (req, res) => {
  const { id } = FireLoadParams.parse({ id: Number(req.params.id) });
  const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!load) return res.status(404).json({ error: "Not found" });
  if (!load.completed) return res.status(400).json({ error: "Load must be completed before firing" });
  if (load.fired) return res.status(400).json({ error: "Already marked as fired" });

  const bodyResult = FireLoadBody.safeParse(req.body);
  const h2oWeightGr = bodyResult.success ? (bodyResult.data.h2oWeightGr ?? null) : null;

  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
  if (cartridge) {
    await db.update(cartridgesTable).set({
      timesFired: cartridge.timesFired + 1,
      currentStep: "Fired",
    }).where(eq(cartridgesTable.id, cartridge.id));
  }

  const [updated] = await db.update(loadsTable).set({ fired: true, h2oWeightGr }).where(eq(loadsTable.id, id)).returning();
  res.json(updated);
});

export default router;
