import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

export default router;
