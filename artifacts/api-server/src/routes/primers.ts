import { Router } from "express";
import { db } from "@workspace/db";
import { primersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePrimerBody,
  UpdatePrimerBody,
  UpdatePrimerParams,
  DeletePrimerParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/primers", async (req, res) => {
  const rows = await db.select().from(primersTable).orderBy(primersTable.manufacturer);
  res.json(rows);
});

router.post("/primers", async (req, res) => {
  const body = CreatePrimerBody.parse(req.body);
  const [row] = await db.insert(primersTable).values({
    manufacturer: body.manufacturer,
    type: body.type,
    quantityAvailable: body.quantityAvailable,
    notes: body.notes ?? null,
    photoBase64: body.photoBase64 ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/primers/:id", async (req, res) => {
  const { id } = UpdatePrimerParams.parse({ id: Number(req.params.id) });
  const body = UpdatePrimerBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
  if (body.type !== undefined) updates.type = body.type;
  if (body.quantityAvailable !== undefined) updates.quantityAvailable = body.quantityAvailable;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  const [row] = await db.update(primersTable).set(updates).where(eq(primersTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

router.delete("/primers/:id", async (req, res) => {
  const { id } = DeletePrimerParams.parse({ id: Number(req.params.id) });
  await db.delete(primersTable).where(eq(primersTable.id, id));
  res.status(204).send();
});

export default router;
