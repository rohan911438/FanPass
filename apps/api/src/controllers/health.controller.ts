import type { Request, Response } from "express";

export function getHealth(req: Request, res: Response) {
  res.json({ status: "ok", service: "fanpass-api", timestamp: new Date().toISOString() });
}
