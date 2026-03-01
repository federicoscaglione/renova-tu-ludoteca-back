import { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index";

export async function health(_req: Request, res: Response): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
}
