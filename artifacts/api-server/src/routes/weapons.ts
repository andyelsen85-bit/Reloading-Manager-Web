import { Router } from "express";
import { db } from "@workspace/db";
import { weaponsTable, weaponPhotosTable, weaponLicensesTable, weaponLicensePhotosTable, weaponLicenseWeaponsTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const WeaponBody = z.object({
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  model: z.string().optional().nullable(),
  type: z.string().min(1),
  caliber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  actionType: z.string().optional().nullable(),
  barrelLengthIn: z.number().optional().nullable(),
  weightKg: z.number().optional().nullable(),
  color: z.string().optional().nullable(),
  countryOfOrigin: z.string().optional().nullable(),
  buyDate: z.string().optional().nullable(),
  buyPrice: z.number().optional().nullable(),
  buyFrom: z.string().optional().nullable(),
  sold: z.boolean().optional(),
  sellDate: z.string().optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  soldTo: z.string().optional().nullable(),
  soldNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const PhotoBody = z.object({
  photoBase64: z.string().min(1),
  caption: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

router.get("/weapons", async (_req, res) => {
  const weapons = await db.select().from(weaponsTable).orderBy(weaponsTable.createdAt);
  const photos = await db.select().from(weaponPhotosTable).orderBy(asc(weaponPhotosTable.sortOrder), asc(weaponPhotosTable.id));
  const result = weapons.map((w) => ({
    ...w,
    photos: photos.filter((p) => p.weaponId === w.id),
  }));
  res.json(result);
});

router.post("/weapons", async (req, res) => {
  const body = WeaponBody.parse(req.body);
  const [row] = await db.insert(weaponsTable).values({
    name: body.name,
    manufacturer: body.manufacturer,
    model: body.model ?? null,
    type: body.type,
    caliber: body.caliber ?? null,
    serialNumber: body.serialNumber ?? null,
    actionType: body.actionType ?? null,
    barrelLengthIn: body.barrelLengthIn ?? null,
    weightKg: body.weightKg ?? null,
    color: body.color ?? null,
    countryOfOrigin: body.countryOfOrigin ?? null,
    buyDate: body.buyDate ?? null,
    buyPrice: body.buyPrice ?? null,
    buyFrom: body.buyFrom ?? null,
    sold: body.sold ?? false,
    sellDate: body.sellDate ?? null,
    sellPrice: body.sellPrice ?? null,
    soldTo: body.soldTo ?? null,
    soldNotes: body.soldNotes ?? null,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json({ ...row, photos: [] });
});

router.patch("/weapons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = WeaponBody.partial().parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
  if (body.model !== undefined) updates.model = body.model;
  if (body.type !== undefined) updates.type = body.type;
  if (body.caliber !== undefined) updates.caliber = body.caliber;
  if (body.serialNumber !== undefined) updates.serialNumber = body.serialNumber;
  if (body.actionType !== undefined) updates.actionType = body.actionType;
  if (body.barrelLengthIn !== undefined) updates.barrelLengthIn = body.barrelLengthIn;
  if (body.weightKg !== undefined) updates.weightKg = body.weightKg;
  if (body.color !== undefined) updates.color = body.color;
  if (body.countryOfOrigin !== undefined) updates.countryOfOrigin = body.countryOfOrigin;
  if (body.buyDate !== undefined) updates.buyDate = body.buyDate;
  if (body.buyPrice !== undefined) updates.buyPrice = body.buyPrice;
  if (body.buyFrom !== undefined) updates.buyFrom = body.buyFrom;
  if (body.sold !== undefined) updates.sold = body.sold;
  if (body.sellDate !== undefined) updates.sellDate = body.sellDate;
  if (body.sellPrice !== undefined) updates.sellPrice = body.sellPrice;
  if (body.soldTo !== undefined) updates.soldTo = body.soldTo;
  if (body.soldNotes !== undefined) updates.soldNotes = body.soldNotes;
  if (body.notes !== undefined) updates.notes = body.notes;
  const [row] = await db.update(weaponsTable).set(updates).where(eq(weaponsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const photos = await db.select().from(weaponPhotosTable).where(eq(weaponPhotosTable.weaponId, id)).orderBy(asc(weaponPhotosTable.sortOrder), asc(weaponPhotosTable.id));
  res.json({ ...row, photos });
});

router.delete("/weapons/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(weaponPhotosTable).where(eq(weaponPhotosTable.weaponId, id));
  await db.delete(weaponsTable).where(eq(weaponsTable.id, id));
  res.status(204).send();
});

router.post("/weapons/:id/photos", async (req, res) => {
  const id = Number(req.params.id);
  const body = PhotoBody.parse(req.body);
  const [photo] = await db.insert(weaponPhotosTable).values({
    weaponId: id,
    photoBase64: body.photoBase64,
    caption: body.caption ?? null,
    sortOrder: body.sortOrder ?? 0,
  }).returning();
  res.status(201).json(photo);
});

router.delete("/weapons/:id/photos/:photoId", async (req, res) => {
  const photoId = Number(req.params.photoId);
  await db.delete(weaponPhotosTable).where(eq(weaponPhotosTable.id, photoId));
  res.status(204).send();
});

// ─── License helpers ──────────────────────────────────────────────────────────

const LicenseBody = z.object({
  name: z.string().min(1),
  licenseNumber: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  weaponIds: z.array(z.number()).optional(),
});

async function buildLicense(id: number) {
  const [license] = await db.select().from(weaponLicensesTable).where(eq(weaponLicensesTable.id, id));
  if (!license) return null;
  const photos = await db.select().from(weaponLicensePhotosTable)
    .where(eq(weaponLicensePhotosTable.licenseId, id))
    .orderBy(asc(weaponLicensePhotosTable.sortOrder), asc(weaponLicensePhotosTable.id));
  const links = await db.select().from(weaponLicenseWeaponsTable).where(eq(weaponLicenseWeaponsTable.licenseId, id));
  const weaponIds = links.map((l) => l.weaponId);
  let weapons: any[] = [];
  if (weaponIds.length > 0) {
    weapons = await db.select().from(weaponsTable).where(inArray(weaponsTable.id, weaponIds));
  }
  return { ...license, photos, weapons };
}

router.get("/weapon-licenses", async (_req, res) => {
  const licenses = await db.select().from(weaponLicensesTable).orderBy(weaponLicensesTable.createdAt);
  const allPhotos = await db.select().from(weaponLicensePhotosTable)
    .orderBy(asc(weaponLicensePhotosTable.sortOrder), asc(weaponLicensePhotosTable.id));
  const allLinks = await db.select().from(weaponLicenseWeaponsTable);
  const allWeapons = await db.select().from(weaponsTable);

  const result = licenses.map((lic) => {
    const photos = allPhotos.filter((p) => p.licenseId === lic.id);
    const weaponIds = allLinks.filter((l) => l.licenseId === lic.id).map((l) => l.weaponId);
    const weapons = allWeapons.filter((w) => weaponIds.includes(w.id));
    return { ...lic, photos, weapons };
  });
  res.json(result);
});

router.post("/weapon-licenses", async (req, res) => {
  const body = LicenseBody.parse(req.body);
  const [lic] = await db.insert(weaponLicensesTable).values({
    name: body.name,
    licenseNumber: body.licenseNumber ?? null,
    issueDate: body.issueDate ?? null,
    expiryDate: body.expiryDate ?? null,
    notes: body.notes ?? null,
  }).returning();

  if (body.weaponIds && body.weaponIds.length > 0) {
    await db.insert(weaponLicenseWeaponsTable).values(
      body.weaponIds.map((wid) => ({ licenseId: lic.id, weaponId: wid }))
    );
  }

  res.status(201).json(await buildLicense(lic.id));
});

router.patch("/weapon-licenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = LicenseBody.partial().parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.licenseNumber !== undefined) updates.licenseNumber = body.licenseNumber;
  if (body.issueDate !== undefined) updates.issueDate = body.issueDate;
  if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length > 0) {
    await db.update(weaponLicensesTable).set(updates).where(eq(weaponLicensesTable.id, id));
  }

  if (body.weaponIds !== undefined) {
    await db.delete(weaponLicenseWeaponsTable).where(eq(weaponLicenseWeaponsTable.licenseId, id));
    if (body.weaponIds.length > 0) {
      await db.insert(weaponLicenseWeaponsTable).values(
        body.weaponIds.map((wid) => ({ licenseId: id, weaponId: wid }))
      );
    }
  }

  const result = await buildLicense(id);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

router.delete("/weapon-licenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(weaponLicenseWeaponsTable).where(eq(weaponLicenseWeaponsTable.licenseId, id));
  await db.delete(weaponLicensePhotosTable).where(eq(weaponLicensePhotosTable.licenseId, id));
  await db.delete(weaponLicensesTable).where(eq(weaponLicensesTable.id, id));
  res.status(204).send();
});

router.post("/weapon-licenses/:id/photos", async (req, res) => {
  const id = Number(req.params.id);
  const body = PhotoBody.parse(req.body);
  const [photo] = await db.insert(weaponLicensePhotosTable).values({
    licenseId: id,
    photoBase64: body.photoBase64,
    caption: body.caption ?? null,
    sortOrder: body.sortOrder ?? 0,
  }).returning();
  res.status(201).json(photo);
});

router.delete("/weapon-licenses/:id/photos/:photoId", async (req, res) => {
  const photoId = Number(req.params.photoId);
  await db.delete(weaponLicensePhotosTable).where(eq(weaponLicensePhotosTable.id, photoId));
  res.status(204).send();
});

export default router;
