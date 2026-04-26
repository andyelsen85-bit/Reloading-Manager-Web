import { Router } from "express";
import { db } from "@workspace/db";
import {
  cartridgesTable,
  bulletsTable,
  powdersTable,
  primersTable,
  loadsTable,
  settingsTable,
  referenceDataTable,
  chargeLaddersTable,
  chargeLevelsTable,
  ammoInventoryTable,
  weaponsTable,
  weaponPhotosTable,
  weaponLicensesTable,
  weaponLicensePhotosTable,
  weaponLicenseWeaponsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/backup", async (_req, res) => {
  try {
    const [
      cartridges, bullets, powders, primers, loads,
      settings, referenceData, chargeLadders, chargeLevels, ammoInventory,
      weapons, weaponPhotos, weaponLicenses, weaponLicensePhotos, weaponLicenseWeapons,
    ] = await Promise.all([
      db.select().from(cartridgesTable),
      db.select().from(bulletsTable),
      db.select().from(powdersTable),
      db.select().from(primersTable),
      db.select().from(loadsTable),
      db.select().from(settingsTable),
      db.select().from(referenceDataTable),
      db.select().from(chargeLaddersTable),
      db.select().from(chargeLevelsTable),
      db.select().from(ammoInventoryTable),
      db.select().from(weaponsTable),
      db.select().from(weaponPhotosTable),
      db.select().from(weaponLicensesTable),
      db.select().from(weaponLicensePhotosTable),
      db.select().from(weaponLicenseWeaponsTable),
    ]);

    const backup = {
      version: 3,
      exportedAt: new Date().toISOString(),
      cartridges,
      bullets,
      powders,
      primers,
      loads,
      settings,
      referenceData,
      chargeLadders,
      chargeLevels,
      ammoInventory,
      weapons,
      weaponPhotos,
      weaponLicenses,
      weaponLicensePhotos,
      weaponLicenseWeapons,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reloading-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Backup failed" });
  }
});

router.post("/restore", async (req, res) => {
  const data = req.body as Record<string, unknown>;

  if (!data || typeof data !== "object" || !("version" in data)) {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  try {
    await db.transaction(async (tx) => {
      // ── 1. Truncate all tables in FK-safe order and reset sequences ──────────
      // charge_levels references charge_ladders (CASCADE), loads references cartridges etc.
      // TRUNCATE handles FK order; RESTART IDENTITY resets serials.
      await tx.execute(sql`
        TRUNCATE TABLE
          weapon_license_weapons,
          weapon_license_photos,
          weapon_licenses,
          weapon_photos,
          weapons,
          ammo_inventory,
          charge_levels,
          loads,
          charge_ladders,
          cartridges,
          bullets,
          powders,
          primers,
          reference_data,
          settings
        RESTART IDENTITY CASCADE
      `);

      // ── 2. Re-insert in dependency order ────────────────────────────────────

      // Standalone / leaf tables first
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        await tx.insert(settingsTable).values(data.settings as any[]);
      } else {
        // Always ensure a settings row exists
        await tx.execute(sql`INSERT INTO settings DEFAULT VALUES ON CONFLICT DO NOTHING`);
      }

      if (Array.isArray(data.referenceData) && data.referenceData.length > 0) {
        await tx.insert(referenceDataTable).values(data.referenceData as any[]);
      }

      if (Array.isArray(data.cartridges) && data.cartridges.length > 0) {
        await tx.insert(cartridgesTable).values(data.cartridges as any[]);
      }

      if (Array.isArray(data.bullets) && data.bullets.length > 0) {
        await tx.insert(bulletsTable).values(data.bullets as any[]);
      }

      if (Array.isArray(data.powders) && data.powders.length > 0) {
        await tx.insert(powdersTable).values(data.powders as any[]);
      }

      if (Array.isArray(data.primers) && data.primers.length > 0) {
        await tx.insert(primersTable).values(data.primers as any[]);
      }

      // charge_ladders depends on cartridges, bullets, primers
      if (Array.isArray(data.chargeLadders) && data.chargeLadders.length > 0) {
        await tx.insert(chargeLaddersTable).values(data.chargeLadders as any[]);
      }

      // charge_levels depends on charge_ladders (CASCADE)
      if (Array.isArray(data.chargeLevels) && data.chargeLevels.length > 0) {
        await tx.insert(chargeLevelsTable).values(data.chargeLevels as any[]);
      }

      // loads depends on cartridges, primers, powders, bullets, charge_ladders
      if (Array.isArray(data.loads) && data.loads.length > 0) {
        await tx.insert(loadsTable).values(data.loads as any[]);
      }

      // ammo_inventory — standalone (added in v2; v1 backups simply skip this)
      if (Array.isArray(data.ammoInventory) && data.ammoInventory.length > 0) {
        await tx.insert(ammoInventoryTable).values(data.ammoInventory as any[]);
      }

      // weapons — standalone (added in v3; older backups skip)
      if (Array.isArray(data.weapons) && data.weapons.length > 0) {
        await tx.insert(weaponsTable).values(data.weapons as any[]);
      }
      if (Array.isArray(data.weaponPhotos) && data.weaponPhotos.length > 0) {
        await tx.insert(weaponPhotosTable).values(data.weaponPhotos as any[]);
      }
      if (Array.isArray(data.weaponLicenses) && data.weaponLicenses.length > 0) {
        await tx.insert(weaponLicensesTable).values(data.weaponLicenses as any[]);
      }
      if (Array.isArray(data.weaponLicensePhotos) && data.weaponLicensePhotos.length > 0) {
        await tx.insert(weaponLicensePhotosTable).values(data.weaponLicensePhotos as any[]);
      }
      if (Array.isArray(data.weaponLicenseWeapons) && data.weaponLicenseWeapons.length > 0) {
        await tx.insert(weaponLicenseWeaponsTable).values(data.weaponLicenseWeapons as any[]);
      }

      // ── 3. Advance all sequences past the max restored ID ───────────────────
      // TRUNCATE RESTART IDENTITY resets to 1, but inserted rows have explicit IDs.
      // We must advance each sequence to MAX(id) to avoid conflicts on future inserts.
      const seqTables: [string, string][] = [
        ["cartridges_id_seq",    "cartridges"],
        ["bullets_id_seq",       "bullets"],
        ["powders_id_seq",       "powders"],
        ["primers_id_seq",       "primers"],
        ["loads_id_seq",         "loads"],
        ["settings_id_seq",      "settings"],
        ["reference_data_id_seq","reference_data"],
        ["charge_ladders_id_seq","charge_ladders"],
        ["charge_levels_id_seq", "charge_levels"],
        ["ammo_inventory_id_seq",          "ammo_inventory"],
        ["weapons_id_seq",                 "weapons"],
        ["weapon_photos_id_seq",           "weapon_photos"],
        ["weapon_licenses_id_seq",         "weapon_licenses"],
        ["weapon_license_photos_id_seq",   "weapon_license_photos"],
        ["weapon_license_weapons_id_seq",  "weapon_license_weapons"],
      ];
      for (const [seq, tbl] of seqTables) {
        await tx.execute(
          sql.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${tbl}"), 1))`)
        );
      }
    });

    res.json({ ok: true, message: "Restore complete" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Restore failed" });
  }
});

export default router;
