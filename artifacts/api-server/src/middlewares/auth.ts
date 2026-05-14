import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [user] = await db.select({ id: usersTable.id, role: usersTable.role, active: usersTable.active })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.active) { res.status(401).json({ error: "Not authenticated" }); return; }
  (req as any).currentUser = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = (req as any).currentUser;
    if (user?.role !== "admin") { res.status(403).json({ error: "Admin required" }); return; }
    next();
  });
}

export function requireAuthOrAdmin(allowNormalForRead = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (allowNormalForRead && req.method === "GET") {
      await requireAuth(req, res, next);
    } else {
      await requireAdmin(req, res, next);
    }
  };
}
