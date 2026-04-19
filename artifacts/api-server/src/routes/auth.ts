import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const SETUP_SENTINEL = "$NEEDS_SETUP$";

const router = Router();

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.get("/auth/setup-status", async (_req, res) => {
  const [admin] = await db.select({ passwordHash: usersTable.passwordHash }).from(usersTable).where(eq(usersTable.username, "admin"));
  const needsSetup = !admin || admin.passwordHash === SETUP_SENTINEL;
  res.json({ needsSetup });
});

const SetupAdminBody = z.object({
  password: z.string().min(6),
});

router.post("/auth/setup-admin", async (req, res) => {
  const body = SetupAdminBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
  if (!admin || admin.passwordHash !== SETUP_SENTINEL) {
    return res.status(403).json({ error: "Setup already completed or admin not found" });
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const [user] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.username, "admin")).returning();
  if (!user) return res.status(500).json({ error: "Failed to set password" });

  (req.session as any).userId = user.id;
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
});

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, body.data.username));
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  if (user.passwordHash === SETUP_SENTINEL) {
    return res.status(403).json({ error: "Account setup required. Please create a password first." });
  }

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  (req.session as any).userId = user.id;
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  res.status(204).send();
});

router.get("/auth/me", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.active) return res.status(401).json({ error: "Not authenticated" });

  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
});

const UpdateProfileBody = z.object({
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  notificationsEnabled: z.boolean().optional(),
});

const ChangePasswordBody = z.object({
  newPassword: z.string().min(6),
});

router.patch("/auth/profile", requireAuth as any, async (req, res) => {
  const userId = (req.session as any).userId;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const body = parsed.data;
  const updates: Record<string, unknown> = {};
  if (body.email !== undefined && body.email !== "") updates.email = body.email;
  if (body.notificationsEnabled !== undefined) updates.notificationsEnabled = body.notificationsEnabled;

  if (Object.keys(updates).length === 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
});

router.get("/auth/notification-prefs", requireAuth as any, async (req, res) => {
  const userId = (req.session as any).userId;
  const [user] = await db.select({ notificationPrefs: usersTable.notificationPrefs }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(404).json({ error: "Not found" });
  let prefs = { loadCreated: true, loadCompleted: true, loadFired: true, lowStock: true };
  try { const saved = JSON.parse(user.notificationPrefs ?? "{}"); prefs = { ...prefs, ...saved }; } catch {}
  res.json(prefs);
});

router.patch("/auth/notification-prefs", requireAuth as any, async (req, res) => {
  const userId = (req.session as any).userId;
  const body = req.body as Record<string, boolean>;
  const allowed = ["loadCreated", "loadCompleted", "loadFired", "lowStock"];
  const prefs: Record<string, boolean> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") prefs[key] = body[key];
  }
  const [existing] = await db.select({ notificationPrefs: usersTable.notificationPrefs }).from(usersTable).where(eq(usersTable.id, userId));
  let current: Record<string, boolean> = {};
  try { current = JSON.parse(existing?.notificationPrefs ?? "{}"); } catch {}
  const merged = { ...current, ...prefs };
  const [user] = await db.update(usersTable).set({ notificationPrefs: JSON.stringify(merged) }).where(eq(usersTable.id, userId)).returning();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(merged);
});

router.post("/auth/change-password", requireAuth as any, async (req, res) => {
  const userId = (req.session as any).userId;
  const body = ChangePasswordBody.parse(req.body);
  const passwordHash = await bcrypt.hash(body.newPassword, 12);
  const [user] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId)).returning({ id: usersTable.id });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
