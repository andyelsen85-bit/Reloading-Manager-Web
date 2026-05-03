import { Router } from "express";
import { db } from "@workspace/db";
import { ammoInventoryTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const SAFE_IMAGE_DATA_URL = /^data:image\/(jpeg|png|gif|webp|bmp|tiff|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

const photoField = () =>
  z.string()
    .max(3_000_000, "Photo exceeds maximum allowed size")
    .refine((val) => SAFE_IMAGE_DATA_URL.test(val), {
      message: "photoBase64 must be a valid image data URL (jpeg, png, gif, webp, bmp, tiff, or svg+xml)",
    })
    .optional()
    .nullable();

const CreateBody = z.object({
  manufacturer: z.string().min(1).max(200),
  caliber: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  bulletWeightGr: z.number().optional().nullable(),
  countTotal: z.number().int().min(0),
  notes: z.string().max(10_000).optional().nullable(),
  photoBase64: photoField(),
});

const UpdateBody = z.object({
  manufacturer: z.string().max(200).optional(),
  caliber: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  bulletWeightGr: z.number().optional().nullable(),
  countTotal: z.number().int().min(0).optional(),
  notes: z.string().max(10_000).optional().nullable(),
  photoBase64: photoField(),
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

    // Perform the update atomically: only succeeds when there are enough rounds remaining.
    // The WHERE clause enforces the bounds check inside the database, eliminating the
    // read-then-write race that would allow countFired to exceed countTotal under
    // concurrent requests.
    const [row] = await db.update(ammoInventoryTable)
      .set({ countFired: sql`${ammoInventoryTable.countFired} + ${count}` })
      .where(and(
        eq(ammoInventoryTable.id, id),
        sql`${ammoInventoryTable.countFired} + ${count} <= ${ammoInventoryTable.countTotal}`
      ))
      .returning();

    if (!row) {
      // Distinguish "not found" from "insufficient rounds"
      const [existing] = await db.select().from(ammoInventoryTable).where(eq(ammoInventoryTable.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const remaining = existing.countTotal - existing.countFired;
      return res.status(400).json({ error: `Cannot fire ${count} — only ${remaining} rounds remaining` });
    }

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
