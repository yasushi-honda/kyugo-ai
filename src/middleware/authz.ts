import { Request, Response, NextFunction } from "express";
import * as caseRepo from "../repositories/case-repository.js";

/** admin role 必須ミドルウェア（requireAuth 適用後に使用すること） */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/**
 * ケースの所有権を検証するミドルウェア。
 * - admin: 全ケースにアクセス可
 * - staff: assignedStaffId === req.user.staffId のケースのみ
 *
 * req.params.id からケースIDを取得し、ケースデータを req.caseData にセットする。
 */
export async function requireCaseAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const caseId = req.params.id as string | undefined;
  if (!caseId) {
    next();
    return;
  }

  try {
    const caseData = await caseRepo.getCase(caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    if (user.role !== "admin" && caseData.assignedStaffId !== user.staffId) {
      res.status(403).json({ error: "Access denied: not assigned to this case" });
      return;
    }

    req.caseData = caseData;
    next();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
