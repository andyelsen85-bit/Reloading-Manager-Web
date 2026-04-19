import { Router } from "express";
import { db } from "@workspace/db";
import { loadsTable, cartridgesTable, bulletsTable, powdersTable, primersTable, settingsTable, usersTable, chargeLevelsTable } from "@workspace/db";
import { eq, desc, isNull, isNotNull, max, sql } from "drizzle-orm";
import {
  CreateLoadBody,
  UpdateLoadBody,
  GetLoadParams,
  UpdateLoadParams,
  CompleteLoadParams,
  FireLoadParams,
  FireLoadBody,
} from "@workspace/api-zod";
import { z } from "zod";
import nodemailer from "nodemailer";

const DeleteLoadBody = z.object({
  restockPrimers: z.number().optional(),
  restockPowderGr: z.number().optional(),
  restockBullets: z.number().optional(),
  note: z.string().optional(),
});

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length === 0) {
    const [row] = await db.insert(settingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

type NotifEvent = "loadCreated" | "loadCompleted" | "loadFired" | "lowStock";

async function sendNotification(subject: string, text: string, event: NotifEvent) {
  try {
    const settings = await getOrCreateSettings();
    if (!settings.smtpEnabled || !settings.smtpHost || !settings.smtpFrom) return;

    const users = await db.select({
      email: usersTable.email,
      notificationPrefs: usersTable.notificationPrefs,
    }).from(usersTable).where(eq(usersTable.notificationsEnabled, true));
    if (users.length === 0) return;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass ?? "" } : undefined,
    });

    for (const user of users) {
      if (!user.email) continue;
      let prefs: Record<string, boolean> = {};
      try { prefs = JSON.parse(user.notificationPrefs ?? "{}"); } catch {}
      const eventEnabled = event in prefs ? prefs[event] : true;
      if (!eventEnabled) continue;
      await transporter.sendMail({ from: settings.smtpFrom, to: user.email, subject, text }).catch(() => {});
    }
  } catch {
    // Silently ignore notification errors
  }
}

const router = Router();

router.get("/loads", async (_req, res) => {
  const rows = await db.select().from(loadsTable)
    .where(isNull(loadsTable.deletedAt))
    .orderBy(desc(loadsTable.id));
  res.json(rows);
});

router.post("/loads", async (req, res) => {
  const body = CreateLoadBody.parse(req.body);
  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, body.cartridgeId));
  if (!cartridge) return res.status(404).json({ error: "Cartridge not found" });

  let loadNumber = 0;
  let reloadingCycle = 1;

  if (body.parentLoadId != null) {
    // New cycle: inherit the parent's loadNumber (no counter change)
    const [parentLoad] = await db.select({ loadNumber: loadsTable.loadNumber }).from(loadsTable).where(eq(loadsTable.id, body.parentLoadId));
    if (!parentLoad) return res.status(404).json({ error: "Parent load not found" });
    loadNumber = parentLoad.loadNumber ?? body.parentLoadId;
    // Cycle = highest existing cycle for this batch + 1
    const [{ maxCycle }] = await db.select({ maxCycle: max(loadsTable.reloadingCycle) }).from(loadsTable).where(eq(loadsTable.loadNumber, loadNumber));
    reloadingCycle = (maxCycle ?? 0) + 1;
  } else {
    // Atomically increment the counter and claim the old value in one SQL statement.
    // UPDATE ... RETURNING is atomic — no two concurrent requests can ever get the same number.
    const [claimed] = await db
      .update(settingsTable)
      .set({ nextLoadNumber: sql`${settingsTable.nextLoadNumber} + 1` })
      .returning({ loadNumber: sql<number>`${settingsTable.nextLoadNumber} - 1` });
    if (!claimed) throw new Error("Settings row not found");
    loadNumber = claimed.loadNumber;
  }

  const today = new Date().toISOString().split("T")[0];
  const [row] = await db.insert(loadsTable).values({
    loadNumber,
    cartridgeId: body.cartridgeId,
    cartridgeProductionCharge: cartridge.productionCharge,
    reloadingCycle,
    date: today,
    caliber: cartridge.caliber,
    cartridgeQuantityUsed: body.cartridgeQuantityUsed,
    notes: body.notes ?? null,
    completed: false,
    fired: false,
  }).returning();

  // Only adjust cartridge quantityLoaded for brand-new loads, not new cycles
  // (new cycles reuse the same brass — no additional inventory consumed)
  if (body.parentLoadId == null) {
    await db.update(cartridgesTable).set({
      quantityLoaded: cartridge.quantityLoaded + body.cartridgeQuantityUsed,
      currentStep: "Washing",
    }).where(eq(cartridgesTable.id, cartridge.id));
  }

  // Send notification
  await sendNotification(
    `New Load Created: #${String(loadNumber).padStart(5, "0")} — ${cartridge.caliber}`,
    `A new load (#${String(loadNumber).padStart(5, "0")}) has been created for ${cartridge.manufacturer} ${cartridge.caliber}, quantity: ${body.cartridgeQuantityUsed}`,
    "loadCreated"
  );

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
  if (body.annealingDone !== undefined) updates.annealingDone = body.annealingDone;
  if (body.secondWashingMinutes !== undefined) updates.secondWashingMinutes = body.secondWashingMinutes;
  if (body.secondWashingDate !== undefined) updates.secondWashingDate = body.secondWashingDate;
  if (body.calibrationType !== undefined) updates.calibrationType = body.calibrationType;
  if (body.calibrationDate !== undefined) updates.calibrationDate = body.calibrationDate;
  if (body.trimDate !== undefined) updates.trimDate = body.trimDate;
  if (body.washingDate !== undefined) updates.washingDate = body.washingDate;
  if (body.annealingDate !== undefined) updates.annealingDate = body.annealingDate;
  if (body.primingDate !== undefined) updates.primingDate = body.primingDate;
  if (body.powderDate !== undefined) updates.powderDate = body.powderDate;
  if (body.bulletSeatingDate !== undefined) updates.bulletSeatingDate = body.bulletSeatingDate;
  if (body.chargeLadderId !== undefined) updates.chargeLadderId = body.chargeLadderId;
  if (body.skippedSteps !== undefined) updates.skippedSteps = body.skippedSteps;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });

  const [existingLoad] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  const [row] = await db.update(loadsTable).set(updates).where(eq(loadsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });

  // Deduct powder from inventory when powder step is marked done for ladder loads
  if (body.powderDate && !existingLoad?.powderDate && row.chargeLadderId) {
    const levels = await db.select().from(chargeLevelsTable).where(eq(chargeLevelsTable.ladderId, row.chargeLadderId));
    const deductionByPowder = new Map<number, number>();
    for (const lvl of levels) {
      if (lvl.powderId && lvl.chargeGr > 0 && lvl.cartridgeCount > 0) {
        const prev = deductionByPowder.get(lvl.powderId) ?? 0;
        deductionByPowder.set(lvl.powderId, prev + lvl.chargeGr * lvl.cartridgeCount);
      }
    }
    for (const [pId, totalGr] of deductionByPowder.entries()) {
      const [powder] = await db.select().from(powdersTable).where(eq(powdersTable.id, pId));
      if (powder) {
        const newGr = Math.max(0, powder.grainsAvailable - totalGr);
        await db.update(powdersTable).set({ grainsAvailable: newGr }).where(eq(powdersTable.id, pId));
      }
    }
  }

  res.json(row);
});

router.delete("/loads/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!load) return res.status(404).json({ error: "Not found" });

  const bodyResult = DeleteLoadBody.safeParse(req.body);
  const opts = bodyResult.success ? bodyResult.data : {};

  // Restock inventory if requested
  if (opts.restockPrimers && load.primerId) {
    const [primer] = await db.select().from(primersTable).where(eq(primersTable.id, load.primerId));
    if (primer) {
      await db.update(primersTable).set({ quantityAvailable: primer.quantityAvailable + opts.restockPrimers }).where(eq(primersTable.id, primer.id));
    }
  }

  if (opts.restockPowderGr && load.powderId) {
    const [powder] = await db.select().from(powdersTable).where(eq(powdersTable.id, load.powderId));
    if (powder) {
      await db.update(powdersTable).set({ grainsAvailable: powder.grainsAvailable + opts.restockPowderGr }).where(eq(powdersTable.id, powder.id));
    }
  }

  if (opts.restockBullets && load.bulletId) {
    const [bullet] = await db.select().from(bulletsTable).where(eq(bulletsTable.id, load.bulletId));
    if (bullet) {
      await db.update(bulletsTable).set({ quantityAvailable: bullet.quantityAvailable + opts.restockBullets }).where(eq(bulletsTable.id, bullet.id));
    }
  }

  // Reverse cartridge quantityLoaded (since we now adjust on creation)
  if (!load.deletedAt) {
    const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
    if (cartridge) {
      await db.update(cartridgesTable).set({
        quantityLoaded: Math.max(0, cartridge.quantityLoaded - load.cartridgeQuantityUsed),
      }).where(eq(cartridgesTable.id, cartridge.id));
    }
  }

  // Soft delete
  await db.update(loadsTable).set({
    deletedAt: new Date(),
    deletedNote: opts.note ?? null,
  }).where(eq(loadsTable.id, id));

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

  // NOTE: quantityLoaded already incremented on creation, don't increment again
  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
  if (cartridge) {
    await db.update(cartridgesTable).set({ currentStep: "Completed" }).where(eq(cartridgesTable.id, cartridge.id));
  }

  const [updated] = await db.update(loadsTable).set({ completed: true }).where(eq(loadsTable.id, id)).returning();
  await sendNotification(
    `Load Completed: #${String(load.loadNumber).padStart(5, "0")} — ${load.caliber}`,
    `Load #${String(load.loadNumber).padStart(5, "0")} (${load.caliber}, ${load.cartridgeQuantityUsed} rounds) has been marked as completed.`,
    "loadCompleted"
  );
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
  const firedDate = bodyResult.success ? (bodyResult.data.firedDate ?? new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0];

  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
  if (cartridge) {
    await db.update(cartridgesTable).set({
      timesFired: cartridge.timesFired + 1,
      currentStep: "Fired",
    }).where(eq(cartridgesTable.id, cartridge.id));
  }

  const [updated] = await db.update(loadsTable).set({ fired: true, h2oWeightGr, firedDate }).where(eq(loadsTable.id, id)).returning();
  await sendNotification(
    `Load Fired: #${String(load.loadNumber).padStart(5, "0")} — ${load.caliber}`,
    `Load #${String(load.loadNumber).padStart(5, "0")} (${load.caliber}, ${load.cartridgeQuantityUsed} rounds) has been marked as fired.${h2oWeightGr ? ` H₂O: ${h2oWeightGr} gr` : ""}`,
    "loadFired"
  );
  res.json(updated);
});

router.post("/loads/:id/undo-complete", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const sessionUser = (req.session as any).userId;
  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  const [authUser] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUser));
  if (!authUser || authUser.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!load) return res.status(404).json({ error: "Not found" });
  if (!load.completed) return res.status(400).json({ error: "Load is not completed" });
  if (load.fired) return res.status(400).json({ error: "Cannot undo completion after firing" });

  const [updated] = await db.update(loadsTable).set({ completed: false }).where(eq(loadsTable.id, id)).returning();
  res.json(updated);
});

router.post("/loads/:id/undo-fire", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const sessionUser = (req.session as any).userId;
  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  const [authUser] = await db.select().from(usersTable).where(eq(usersTable.id, sessionUser));
  if (!authUser || authUser.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const [load] = await db.select().from(loadsTable).where(eq(loadsTable.id, id));
  if (!load) return res.status(404).json({ error: "Not found" });
  if (!load.fired) return res.status(400).json({ error: "Load is not marked as fired" });

  const [updated] = await db.update(loadsTable).set({ fired: false, h2oWeightGr: null }).where(eq(loadsTable.id, id)).returning();

  const [cartridge] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, load.cartridgeId));
  if (cartridge && cartridge.timesFired > 0) {
    await db.update(cartridgesTable).set({ timesFired: cartridge.timesFired - 1 }).where(eq(cartridgesTable.id, cartridge.id));
  }

  res.json(updated);
});

export default router;
