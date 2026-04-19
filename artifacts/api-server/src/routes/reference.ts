import { Router } from "express";
import { db } from "@workspace/db";
import { referenceDataTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const CreateBody = z.object({ value: z.string().min(1), sortOrder: z.number().optional().default(0) });
const UpdateBody = z.object({ value: z.string().optional(), sortOrder: z.number().optional() });

router.get("/reference/:category", async (req, res) => {
  const { category } = req.params;
  const rows = await db.select().from(referenceDataTable)
    .where(eq(referenceDataTable.category, category))
    .orderBy(asc(referenceDataTable.sortOrder), asc(referenceDataTable.value));
  res.json(rows);
});

router.post("/reference/:category", async (req, res) => {
  const { category } = req.params;
  const body = CreateBody.parse(req.body);
  const [row] = await db.insert(referenceDataTable).values({ category, value: body.value, sortOrder: body.sortOrder }).returning();
  res.status(201).json(row);
});

router.patch("/reference/:category/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.value !== undefined) updates.value = body.value;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  const [row] = await db.update(referenceDataTable).set(updates).where(eq(referenceDataTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/reference/:category/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(referenceDataTable).where(eq(referenceDataTable.id, id));
  res.status(204).send();
});

export default router;
