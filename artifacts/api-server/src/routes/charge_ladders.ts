import { Router } from "express";
import { db } from "@workspace/db";
import { chargeLaddersTable, chargeLevelsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const LevelInput = z.object({
  chargeGr: z.number(),
  cartridgeCount: z.number().optional().default(3),
  sortOrder: z.number().optional().default(0),
  notes: z.string().optional(),
});

const CreateLadderBody = z.object({
  name: z.string().min(1),
  caliber: z.string().min(1),
  cartridgeId: z.number().int(),
  bulletId: z.number().optional(),
  primerId: z.number().optional(),
  cartridgesPerLevel: z.number().default(3),
  notes: z.string().optional(),
  levels: z.array(LevelInput).optional().default([]),
});

const UpdateLadderBody = z.object({
  name: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  bulletId: z.number().nullable().optional(),
  primerId: z.number().nullable().optional(),
});

const CreateLevelBody = z.object({
  chargeGr: z.number(),
  cartridgeCount: z.number().optional().default(3),
  sortOrder: z.number().optional().default(0),
  notes: z.string().optional(),
});

const UpdateLevelBody = z.object({
  chargeGr: z.number().optional(),
  cartridgeCount: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  oalIn: z.number().optional(),
  coalIn: z.number().optional(),
  groupSizeMm: z.number().optional(),
  velocityFps: z.number().optional(),
});

const SelectBestBody = z.object({ levelId: z.number().int() });

router.get("/charge-ladders", async (_req, res) => {
  const rows = await db.select().from(chargeLaddersTable).orderBy(asc(chargeLaddersTable.id));
  res.json(rows);
});

router.post("/charge-ladders", async (req, res) => {
  const body = CreateLadderBody.parse(req.body);
  const [ladder] = await db.insert(chargeLaddersTable).values({
    name: body.name,
    caliber: body.caliber,
    cartridgeId: body.cartridgeId,
    bulletId: body.bulletId ?? null,
    primerId: body.primerId ?? null,
    cartridgesPerLevel: body.cartridgesPerLevel,
    notes: body.notes ?? null,
  }).returning();

  if (body.levels && body.levels.length > 0) {
    const sortedLevels = body.levels.map((l, i) => ({ ...l, sortOrder: l.sortOrder ?? i, ladderId: ladder.id }));
    await db.insert(chargeLevelsTable).values(sortedLevels);
  }

  res.status(201).json(ladder);
});

router.get("/charge-ladders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [ladder] = await db.select().from(chargeLaddersTable).where(eq(chargeLaddersTable.id, id));
  if (!ladder) return res.status(404).json({ error: "Not found" });
  const levels = await db.select().from(chargeLevelsTable).where(eq(chargeLevelsTable.ladderId, id)).orderBy(asc(chargeLevelsTable.sortOrder));
  res.json({ ladder, levels });
});

router.patch("/charge-ladders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateLadderBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.status !== undefined) updates.status = body.status;
  if (body.bulletId !== undefined) updates.bulletId = body.bulletId;
  if (body.primerId !== undefined) updates.primerId = body.primerId;
  const [row] = await db.update(chargeLaddersTable).set(updates).where(eq(chargeLaddersTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/charge-ladders/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(chargeLaddersTable).where(eq(chargeLaddersTable.id, id));
  res.status(204).send();
});

router.post("/charge-ladders/:id/levels", async (req, res) => {
  const ladderId = Number(req.params.id);
  const body = CreateLevelBody.parse(req.body);
  const [row] = await db.insert(chargeLevelsTable).values({
    ladderId,
    chargeGr: body.chargeGr,
    cartridgeCount: body.cartridgeCount ?? 3,
    sortOrder: body.sortOrder ?? 0,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/charge-ladders/:id/levels/:levelId", async (req, res) => {
  const levelId = Number(req.params.levelId);
  const body = UpdateLevelBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.chargeGr !== undefined) updates.chargeGr = body.chargeGr;
  if (body.cartridgeCount !== undefined) updates.cartridgeCount = body.cartridgeCount;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.oalIn !== undefined) updates.oalIn = body.oalIn;
  if (body.coalIn !== undefined) updates.coalIn = body.coalIn;
  if (body.groupSizeMm !== undefined) updates.groupSizeMm = body.groupSizeMm;
  if (body.velocityFps !== undefined) updates.velocityFps = body.velocityFps;
  const [row] = await db.update(chargeLevelsTable).set(updates).where(eq(chargeLevelsTable.id, levelId)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/charge-ladders/:id/levels/:levelId", async (req, res) => {
  const levelId = Number(req.params.levelId);
  await db.delete(chargeLevelsTable).where(eq(chargeLevelsTable.id, levelId));
  res.status(204).send();
});

router.post("/charge-ladders/:id/select-best", async (req, res) => {
  const id = Number(req.params.id);
  const body = SelectBestBody.parse(req.body);
  const [row] = await db.update(chargeLaddersTable)
    .set({ bestLevelId: body.levelId, status: "complete" })
    .where(eq(chargeLaddersTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

export default router;
