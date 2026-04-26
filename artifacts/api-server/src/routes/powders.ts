import { Router } from "express";
import { db } from "@workspace/db";
import { powdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePowderBody,
  UpdatePowderBody,
  UpdatePowderParams,
  DeletePowderParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/powders", async (req, res) => {
  const rows = await db.select().from(powdersTable).orderBy(powdersTable.manufacturer);
  res.json(rows);
});

router.post("/powders", async (req, res) => {
  const body = CreatePowderBody.parse(req.body);
  const [row] = await db.insert(powdersTable).values({
    manufacturer: body.manufacturer,
    name: body.name,
    type: body.type,
    grainsAvailable: body.grainsAvailable,
    notes: body.notes ?? null,
    photoBase64: body.photoBase64 ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/powders/:id", async (req, res) => {
  const { id } = UpdatePowderParams.parse({ id: Number(req.params.id) });
  const body = UpdatePowderBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
  if (body.name !== undefined) updates.name = body.name;
  if (body.type !== undefined) updates.type = body.type;
  if (body.grainsAvailable !== undefined) updates.grainsAvailable = body.grainsAvailable;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  const [row] = await db.update(powdersTable).set(updates).where(eq(powdersTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/powders/:id", async (req, res) => {
  const { id } = DeletePowderParams.parse({ id: Number(req.params.id) });
  await db.delete(powdersTable).where(eq(powdersTable.id, id));
  res.status(204).send();
});

export default router;
