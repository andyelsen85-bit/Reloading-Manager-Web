import { Router } from "express";
import { db } from "@workspace/db";
import { cartridgesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCartridgeBody,
  UpdateCartridgeBody,
  GetCartridgeParams,
  UpdateCartridgeParams,
  DeleteCartridgeParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/cartridges", async (req, res) => {
  const rows = await db.select().from(cartridgesTable).orderBy(cartridgesTable.caliber);
  res.json(rows);
});

router.post("/cartridges", async (req, res) => {
  const body = CreateCartridgeBody.parse(req.body);
  const [row] = await db.insert(cartridgesTable).values({
    manufacturer: body.manufacturer,
    caliber: body.caliber,
    productionCharge: body.productionCharge,
    quantityTotal: body.quantityTotal,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(row);
});

router.get("/cartridges/:id", async (req, res) => {
  const { id } = GetCartridgeParams.parse({ id: Number(req.params.id) });
  const [row] = await db.select().from(cartridgesTable).where(eq(cartridgesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.patch("/cartridges/:id", async (req, res) => {
  const { id } = UpdateCartridgeParams.parse({ id: Number(req.params.id) });
  const body = UpdateCartridgeBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
  if (body.caliber !== undefined) updates.caliber = body.caliber;
  if (body.productionCharge !== undefined) updates.productionCharge = body.productionCharge;
  if (body.quantityTotal !== undefined) updates.quantityTotal = body.quantityTotal;
  if (body.currentStep !== undefined) updates.currentStep = body.currentStep;
  if (body.l6In !== undefined) updates.l6In = body.l6In;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.photoBase64 !== undefined) updates.photoBase64 = body.photoBase64;
  const [row] = await db.update(cartridgesTable).set(updates).where(eq(cartridgesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/cartridges/:id", async (req, res) => {
  const { id } = DeleteCartridgeParams.parse({ id: Number(req.params.id) });
  await db.delete(cartridgesTable).where(eq(cartridgesTable.id, id));
  res.status(204).send();
});

export default router;
