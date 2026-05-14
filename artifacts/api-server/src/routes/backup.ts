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
  emailLogTable,
  weaponMagazinesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// JSON.parse gives us date strings, but Drizzle timestamp columns expect Date objects.
// Walk every row and convert ISO-8601 strings back to Date instances.
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function hydrateDates(rows: any[]): any[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === "string" && ISO_RE.test(v) ? new Date(v) : v;
    }
    return out;
  });
}

router.get("/backup", async (_req, res) => {
  try {
    const [
      cartridges, bullets, powders, primers, loads,
      settings, referenceData, chargeLadders, chargeLevels, ammoInventory,
      weapons, weaponPhotos, weaponLicenses, weaponLicensePhotos, weaponLicenseWeapons,
      emailLog, weaponMagazines,
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
      db.select().from(emailLogTable),
      db.select().from(weaponMagazinesTable),
    ]);

    const backup = {
      version: 5,
      exportedAt: new Date().toISOString(),
      cartridges,
      bullets,
      powders,
      primers,
      loads,
      settings: settings.map(({ smtpPass: _omit, ...rest }) => rest),
      referenceData,
      chargeLadders,
      chargeLevels,
      ammoInventory,
      weapons,
      weaponPhotos,
      weaponLicenses,
      weaponLicensePhotos,
      weaponLicenseWeapons,
      emailLog,
      weaponMagazines,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reloading-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return res.json(backup);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Backup failed" });
  }
});

const CURRENT_BACKUP_VERSION = 5;
// All sections present in a v5 backup — every one must be an array
const REQUIRED_BACKUP_SECTIONS = [
  "cartridges", "bullets", "powders", "primers", "loads",
  "settings", "referenceData", "chargeLadders", "chargeLevels",
  "ammoInventory", "weapons", "weaponPhotos", "weaponLicenses",
  "weaponLicensePhotos", "weaponLicenseWeapons", "emailLog", "weaponMagazines",
] as const;

router.post("/restore", async (req, res) => {
  const data = req.body as Record<string, unknown>;

  if (!data || typeof data !== "object" || !("version" in data)) {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  if (typeof data.version !== "number" || data.version !== CURRENT_BACKUP_VERSION) {
    return res.status(400).json({
      error: `Unsupported backup version. Expected version ${CURRENT_BACKUP_VERSION}, got ${JSON.stringify(data.version)}.`,
    });
  }

  if (typeof data.exportedAt !== "string") {
    return res.status(400).json({ error: "Invalid backup: missing exportedAt timestamp." });
  }

  const missingSections = REQUIRED_BACKUP_SECTIONS.filter(
    (key) => !Array.isArray(data[key])
  );
  if (missingSections.length > 0) {
    return res.status(400).json({
      error: `Invalid backup: missing or malformed required sections: ${missingSections.join(", ")}.`,
    });
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
          weapon_magazines,
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
          settings,
          email_log
        RESTART IDENTITY CASCADE
      `);

      // ── 2. Re-insert in dependency order ────────────────────────────────────

      // Standalone / leaf tables first
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        const settingsRows = (data.settings as Record<string, unknown>[]).map(
          ({ smtpPass: _omit, ...rest }) => rest
        );
        await tx.insert(settingsTable).values(hydrateDates(settingsRows));
      } else {
        // Always ensure a settings row exists
        await tx.execute(sql`INSERT INTO settings DEFAULT VALUES ON CONFLICT DO NOTHING`);
      }

      if (Array.isArray(data.referenceData) && data.referenceData.length > 0) {
        await tx.insert(referenceDataTable).values(hydrateDates(data.referenceData));
      }

      if (Array.isArray(data.cartridges) && data.cartridges.length > 0) {
        await tx.insert(cartridgesTable).values(hydrateDates(data.cartridges));
      }

      if (Array.isArray(data.bullets) && data.bullets.length > 0) {
        await tx.insert(bulletsTable).values(hydrateDates(data.bullets));
      }

      if (Array.isArray(data.powders) && data.powders.length > 0) {
        await tx.insert(powdersTable).values(hydrateDates(data.powders));
      }

      if (Array.isArray(data.primers) && data.primers.length > 0) {
        await tx.insert(primersTable).values(hydrateDates(data.primers));
      }

      // charge_ladders depends on cartridges, bullets, primers
      if (Array.isArray(data.chargeLadders) && data.chargeLadders.length > 0) {
        await tx.insert(chargeLaddersTable).values(hydrateDates(data.chargeLadders));
      }

      // charge_levels depends on charge_ladders (CASCADE)
      if (Array.isArray(data.chargeLevels) && data.chargeLevels.length > 0) {
        await tx.insert(chargeLevelsTable).values(hydrateDates(data.chargeLevels));
      }

      // loads depends on cartridges, primers, powders, bullets, charge_ladders
      if (Array.isArray(data.loads) && data.loads.length > 0) {
        await tx.insert(loadsTable).values(hydrateDates(data.loads));
      }

      // ammo_inventory — standalone (added in v2; v1 backups simply skip this)
      if (Array.isArray(data.ammoInventory) && data.ammoInventory.length > 0) {
        await tx.insert(ammoInventoryTable).values(hydrateDates(data.ammoInventory));
      }

      // weapons — standalone (added in v3; older backups skip)
      if (Array.isArray(data.weapons) && data.weapons.length > 0) {
        await tx.insert(weaponsTable).values(hydrateDates(data.weapons));
      }
      if (Array.isArray(data.weaponPhotos) && data.weaponPhotos.length > 0) {
        await tx.insert(weaponPhotosTable).values(hydrateDates(data.weaponPhotos));
      }
      if (Array.isArray(data.weaponLicenses) && data.weaponLicenses.length > 0) {
        await tx.insert(weaponLicensesTable).values(hydrateDates(data.weaponLicenses));
      }
      if (Array.isArray(data.weaponLicensePhotos) && data.weaponLicensePhotos.length > 0) {
        await tx.insert(weaponLicensePhotosTable).values(hydrateDates(data.weaponLicensePhotos));
      }
      if (Array.isArray(data.weaponLicenseWeapons) && data.weaponLicenseWeapons.length > 0) {
        await tx.insert(weaponLicenseWeaponsTable).values(hydrateDates(data.weaponLicenseWeapons));
      }

      // email_log — standalone (added in v4; older backups skip)
      if (Array.isArray(data.emailLog) && data.emailLog.length > 0) {
        await tx.insert(emailLogTable).values(hydrateDates(data.emailLog));
      }

      // weapon_magazines — depends on weapons (added in v5; older backups skip)
      if (Array.isArray(data.weaponMagazines) && data.weaponMagazines.length > 0) {
        await tx.insert(weaponMagazinesTable).values(hydrateDates(data.weaponMagazines));
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
        ["email_log_id_seq",               "email_log"],
        ["weapon_magazines_id_seq",        "weapon_magazines"],
      ];
      for (const [seq, tbl] of seqTables) {
        await tx.execute(
          sql.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${tbl}"), 1))`)
        );
      }
    });

    return res.json({ ok: true, message: "Restore complete" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Restore failed" });
  }
});

export default router;
