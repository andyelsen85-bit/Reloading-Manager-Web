import { Router } from "express";
import { db } from "@workspace/db";
import { weaponsTable, weaponPhotosTable, weaponLicensesTable, weaponLicensePhotosTable, weaponLicenseWeaponsTable, weaponMagazinesTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const WeaponBody = z.object({
  name: z.string().min(1).max(200),
  manufacturer: z.string().min(1).max(200),
  model: z.string().max(200).optional().nullable(),
  type: z.string().min(1).max(100),
  caliber: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  actionType: z.string().max(100).optional().nullable(),
  barrelLengthIn: z.number().optional().nullable(),
  weightKg: z.number().optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  countryOfOrigin: z.string().max(100).optional().nullable(),
  buyDate: z.string().max(20).optional().nullable(),
  buyPrice: z.number().optional().nullable(),
  buyFrom: z.string().max(200).optional().nullable(),
  sold: z.boolean().optional(),
  sellDate: z.string().max(20).optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  soldTo: z.string().max(200).optional().nullable(),
  soldNotes: z.string().max(10_000).optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
});

const SAFE_IMAGE_DATA_URL = /^data:image\/(jpeg|png|gif|webp|bmp|tiff|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

const PhotoBody = z.object({
  photoBase64: z.string().min(1).max(3_000_000).refine(
    (val) => SAFE_IMAGE_DATA_URL.test(val),
    { message: "photoBase64 must be a valid image data URL (jpeg, png, gif, webp, bmp, tiff, or svg+xml)" }
  ),
  caption: z.string().max(500).optional().nullable(),
  sortOrder: z.number().optional(),
});

router.get("/weapons", async (_req, res) => {
  const weapons = await db.select().from(weaponsTable).orderBy(weaponsTable.createdAt);
  const photos = await db.select().from(weaponPhotosTable).orderBy(asc(weaponPhotosTable.sortOrder), asc(weaponPhotosTable.id));
  const magazines = await db.select().from(weaponMagazinesTable).orderBy(asc(weaponMagazinesTable.createdAt));
  const result = weapons.map((w) => ({
    ...w,
    photos: photos.filter((p) => p.weaponId === w.id),
    magazines: magazines.filter((m) => m.weaponId === w.id),
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
  await db.delete(weaponMagazinesTable).where(eq(weaponMagazinesTable.weaponId, id));
  await db.delete(weaponsTable).where(eq(weaponsTable.id, id));
  res.status(204).send();
});

// ─── Magazine routes ──────────────────────────────────────────────────────────

const MagazineBody = z.object({
  label: z.string().max(200).optional().nullable(),
  capacity: z.number().int().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().max(10_000).optional().nullable(),
});

router.get("/weapons/:id/magazines", async (req, res) => {
  const id = Number(req.params.id);
  const mags = await db.select().from(weaponMagazinesTable)
    .where(eq(weaponMagazinesTable.weaponId, id))
    .orderBy(asc(weaponMagazinesTable.createdAt));
  res.json(mags);
});

router.post("/weapons/:id/magazines", async (req, res) => {
  const id = Number(req.params.id);
  const body = MagazineBody.parse(req.body);
  const [mag] = await db.insert(weaponMagazinesTable).values({
    weaponId: id,
    label: body.label ?? null,
    capacity: body.capacity ?? null,
    quantity: body.quantity ?? 1,
    notes: body.notes ?? null,
  }).returning();
  res.status(201).json(mag);
});

router.patch("/weapons/:id/magazines/:magId", async (req, res) => {
  const magId = Number(req.params.magId);
  const body = MagazineBody.partial().parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.notes !== undefined) updates.notes = body.notes;
  const [mag] = await db.update(weaponMagazinesTable).set(updates).where(eq(weaponMagazinesTable.id, magId)).returning();
  if (!mag) return res.status(404).json({ error: "Not found" });
  res.json(mag);
});

router.delete("/weapons/:id/magazines/:magId", async (req, res) => {
  const magId = Number(req.params.magId);
  await db.delete(weaponMagazinesTable).where(eq(weaponMagazinesTable.id, magId));
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
  name: z.string().min(1).max(200),
  licenseNumber: z.string().max(100).optional().nullable(),
  licenseType: z.string().max(100).optional().nullable(),
  issueDate: z.string().max(20).optional().nullable(),
  expiryDate: z.string().max(20).optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
  weaponIds: z.array(z.number()).max(200).optional(),
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
    licenseType: body.licenseType ?? null,
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
  if (body.licenseType !== undefined) updates.licenseType = body.licenseType;
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
