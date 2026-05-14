import { Router } from "express";
import { db } from "@workspace/db";
import { bulletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateBulletBody,
  UpdateBulletBody,
  UpdateBulletParams,
  DeleteBulletParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/bullets", async (req, res) => {
  const rows = await db.select().from(bulletsTable).orderBy(bulletsTable.manufacturer);
  res.json(rows);
});

router.post("/bullets", async (req, res) => {
  const body = CreateBulletBody.parse(req.body);
  const [row] = await db.insert(bulletsTable).values({
    manufacturer: body.manufacturer,
    model: body.model,
    weightGr: body.weightGr,
    diameterIn: body.diameterIn,
    quantityAvailable: body.quantityAvailable,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/bullets/:id", async (req, res) => {
  const { id } = UpdateBulletParams.parse({ id: Number(req.params.id) });
  const body = UpdateBulletBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
  if (body.model !== undefined) updates.model = body.model;
  if (body.weightGr !== undefined) updates.weightGr = body.weightGr;
  if (body.diameterIn !== undefined) updates.diameterIn = body.diameterIn;
  if (body.quantityAvailable !== undefined) updates.quantityAvailable = body.quantityAvailable;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  const [row] = await db.update(bulletsTable).set(updates).where(eq(bulletsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/bullets/:id", async (req, res) => {
  const { id } = DeleteBulletParams.parse({ id: Number(req.params.id) });
  await db.delete(bulletsTable).where(eq(bulletsTable.id, id));
  res.status(204).send();
});

export default router;
