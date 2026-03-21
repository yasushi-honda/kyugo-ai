import { Router, Request, Response } from "express";
import * as caseRepo from "../repositories/case-repository.js";
import { Timestamp } from "@google-cloud/firestore";
import { requireCaseAccess } from "../middleware/authz.js";
import {
  createCaseSchema,
  updateCaseStatusSchema,
} from "../schemas/case.js";
import { consultationsRouter } from "./consultations.js";
import { supportPlansRouter } from "./support-plans.js";
import { monitoringRouter } from "./monitoring.js";
import { legalSearchRouter } from "./legal-search.js";
import { paramStr, validate } from "./utils.js";
import { toCsv, CsvColumn } from "../utils/csv.js";
import { Case } from "../types.js";
import { logger } from "../utils/logger.js";

export const casesRouter = Router();

// 相談記録ルートを委譲
casesRouter.use("/:id/consultations", consultationsRouter);

// 支援計画書ルートを委譲
casesRouter.use("/:id/support-plan", supportPlansRouter);

// モニタリングシートルートを委譲
casesRouter.use("/:id/monitoring", monitoringRouter);

// 法令検索ルートを委譲
casesRouter.use("/:id/legal-search", legalSearchRouter);

// Timestamp を文字列に変換（CSV用）
function formatTimestamp(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "toDate" in ts) {
    return (ts as Timestamp).toDate().toISOString();
  }
  return String(ts);
}

const STATUS_LABELS: Record<string, string> = {
  active: "対応中",
  referred: "紹介済",
  closed: "終了",
};

const CASE_CSV_COLUMNS: CsvColumn<Case>[] = [
  { header: "ケースID", value: (c) => c.id },
  { header: "相談者名", value: (c) => c.clientName },
  { header: "相談者ID", value: (c) => c.clientId },
  { header: "生年月日", value: (c) => formatTimestamp(c.dateOfBirth) },
  { header: "ステータス", value: (c) => STATUS_LABELS[c.status] ?? c.status },
  { header: "担当職員ID", value: (c) => c.assignedStaffId },
  { header: "作成日時", value: (c) => formatTimestamp(c.createdAt) },
  { header: "更新日時", value: (c) => formatTimestamp(c.updatedAt) },
];

// GET /api/cases/export/csv - ケース一覧CSVエクスポート
casesRouter.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const cases = user.role === "admin"
      ? await caseRepo.listAllCases()
      : await caseRepo.listCasesByStaff(user.staffId);

    const csv = toCsv(CASE_CSV_COLUMNS, cases);
    const filename = `cases_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    logger.error("CSV export failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

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
