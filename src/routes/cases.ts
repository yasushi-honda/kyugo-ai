import { Router, Request, Response } from "express";
import type { ZodType } from "zod";
import * as caseRepo from "../repositories/case-repository.js";
import { Timestamp } from "@google-cloud/firestore";
import { requireCaseAccess } from "../middleware/authz.js";
import {
  createCaseSchema,
  updateCaseStatusSchema,
} from "../schemas/case.js";
import { consultationsRouter } from "./consultations.js";

function validate<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
}

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const casesRouter = Router();

// 相談記録ルートを委譲
casesRouter.use("/:id/consultations", consultationsRouter);

// POST /api/cases - ケース作成（assignedStaffIdはreq.userから強制）
casesRouter.post("/", async (req: Request, res: Response) => {
  const parsed = validate(createCaseSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const data = parsed.data;
    const created = await caseRepo.createCase({
      clientName: data.clientName,
      clientId: data.clientId,
      dateOfBirth: Timestamp.fromDate(new Date(data.dateOfBirth)),
      householdInfo: data.householdInfo,
      incomeInfo: data.incomeInfo,
      assignedStaffId: req.user!.staffId,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases - ケース一覧（自分の担当ケース。adminは全件）
casesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === "admin") {
      // adminはstaffIdクエリパラメータで絞り込み可能
      const staffId = req.query.staffId ? String(req.query.staffId) : undefined;
      if (staffId) {
        const cases = await caseRepo.listCasesByStaff(staffId);
        res.json(cases);
      } else {
        const cases = await caseRepo.listAllCases();
        res.json(cases);
      }
    } else {
      const cases = await caseRepo.listCasesByStaff(user.staffId);
      res.json(cases);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases/:id - ケース取得（認可チェック済み）
casesRouter.get("/:id", requireCaseAccess, async (req: Request, res: Response) => {
  try {
    res.json(req.caseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/cases/:id/status - ステータス変更（認可チェック済み）
casesRouter.patch("/:id/status", requireCaseAccess, async (req: Request, res: Response) => {
  const parsed = validate(updateCaseStatusSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const updated = await caseRepo.updateCaseStatus(paramStr(req.params.id), parsed.data.status);
    res.json(updated);
  } catch (err) {
    const message = (err as Error).message;
    const statusCode = message.includes("not found") ? 404 : message.includes("Invalid") ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});
