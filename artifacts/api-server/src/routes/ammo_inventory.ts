import { Router } from "express";
import { db } from "@workspace/db";
import { ammoInventoryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const CreateBody = z.object({
  manufacturer: z.string().min(1),
  caliber: z.string().min(1),
  model: z.string().min(1),
  bulletWeightGr: z.number().optional().nullable(),
  countTotal: z.number().int().min(0),
  notes: z.string().optional().nullable(),
  photoBase64: z.string().optional().nullable(),
});

const UpdateBody = z.object({
  manufacturer: z.string().optional(),
  caliber: z.string().optional(),
  model: z.string().optional(),
  bulletWeightGr: z.number().optional().nullable(),
  countTotal: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
  photoBase64: z.string().optional().nullable(),
});

const FireBody = z.object({
  count: z.number().int().min(1),
});

router.get("/ammo-inventory", async (_req, res) => {
  try {
    const rows = await db.select().from(ammoInventoryTable).orderBy(ammoInventoryTable.caliber);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to list ammo inventory" });
  }
});

router.post("/ammo-inventory", async (req, res) => {
  try {
    const body = CreateBody.parse(req.body);
    const [row] = await db.insert(ammoInventoryTable).values({
      manufacturer: body.manufacturer,
      caliber: body.caliber,
      model: body.model,
      bulletWeightGr: body.bulletWeightGr ?? null,
      countTotal: body.countTotal,
      notes: body.notes ?? null,
      photoBase64: body.photoBase64 ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(err instanceof z.ZodError ? 400 : 500).json({ error: err?.message ?? "Failed to create" });
  }
});

router.patch("/ammo-inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
    if (body.caliber !== undefined) updates.caliber = body.caliber;
    if (body.model !== undefined) updates.model = body.model;
    if (body.bulletWeightGr !== undefined) updates.bulletWeightGr = body.bulletWeightGr;
    if (body.countTotal !== undefined) updates.countTotal = body.countTotal;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
    const [row] = await db.update(ammoInventoryTable).set(updates).where(eq(ammoInventoryTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to update" });
  }
});

router.post("/ammo-inventory/:id/fire", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { count } = FireBody.parse(req.body);
    const [existing] = await db.select().from(ammoInventoryTable).where(eq(ammoInventoryTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    const remaining = existing.countTotal - existing.countFired;
    if (count > remaining) {
      return res.status(400).json({ error: `Cannot fire ${count} — only ${remaining} rounds remaining` });
    }
    const [row] = await db.update(ammoInventoryTable)
      .set({ countFired: sql`${ammoInventoryTable.countFired} + ${count}` })
      .where(eq(ammoInventoryTable.id, id))
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to record fired rounds" });
  }
});

router.delete("/ammo-inventory/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(ammoInventoryTable).where(eq(ammoInventoryTable.id, id));
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to delete" });
  }
});

export default router;
