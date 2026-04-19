import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, body.data.username));
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

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
  email: z.string().email().nullable().optional(),
  notificationsEnabled: z.boolean().optional(),
});

const ChangePasswordBody = z.object({
  newPassword: z.string().min(6),
});

router.patch("/auth/profile", requireAuth as any, async (req, res) => {
  const userId = (req.session as any).userId;
  const body = UpdateProfileBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email;
  if (body.notificationsEnabled !== undefined) updates.notificationsEnabled = body.notificationsEnabled;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, notificationsEnabled: user.notificationsEnabled });
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
