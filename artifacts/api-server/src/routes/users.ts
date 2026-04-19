import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router = Router();

const CreateUserBody = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional().default("user"),
  notificationsEnabled: z.boolean().optional().default(true),
});

const UpdateUserBody = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  active: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});

const ResetPasswordBody = z.object({
  newPassword: z.string().min(6),
});

router.get("/users", async (_req, res) => {
  const rows = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    active: usersTable.active,
    notificationsEnabled: usersTable.notificationsEnabled,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(rows);
});

router.post("/users", async (req, res) => {
  const body = CreateUserBody.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const [row] = await db.insert(usersTable).values({
    username: body.username,
    email: body.email,
    passwordHash,
    role: body.role,
    notificationsEnabled: body.notificationsEnabled,
  }).returning({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    active: usersTable.active,
    notificationsEnabled: usersTable.notificationsEnabled,
    createdAt: usersTable.createdAt,
  });
  res.status(201).json(row);
});

router.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateUserBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.username !== undefined) updates.username = body.username;
  if (body.email !== undefined) updates.email = body.email;
  if (body.role !== undefined) updates.role = body.role;
  if (body.active !== undefined) updates.active = body.active;
  if (body.notificationsEnabled !== undefined) updates.notificationsEnabled = body.notificationsEnabled;

  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    role: usersTable.role,
    active: usersTable.active,
    notificationsEnabled: usersTable.notificationsEnabled,
    createdAt: usersTable.createdAt,
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

router.post("/users/:id/reset-password", async (req, res) => {
  const id = Number(req.params.id);
  const body = ResetPasswordBody.parse(req.body);
  const passwordHash = await bcrypt.hash(body.newPassword, 12);
  const [row] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (!row) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
