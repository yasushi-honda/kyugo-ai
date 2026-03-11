import { Router, Request, Response } from "express";
import * as monitoringRepo from "../repositories/monitoring-repository.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportPlanRepo from "../repositories/support-plan-repository.js";
import { generateMonitoringDraft } from "../services/ai.js";
import { requireCaseAccess } from "../middleware/authz.js";
import { aiLimiter } from "../middleware/rate-limit.js";
import { updateMonitoringSheetSchema } from "../schemas/case.js";
import { Case } from "../types.js";
import { paramStr, validate, formatDateString } from "./utils.js";

export const monitoringRouter = Router({ mergeParams: true });

monitoringRouter.use(requireCaseAccess);

// POST /api/cases/:id/monitoring/draft — AI下書き生成
monitoringRouter.post("/draft", aiLimiter, async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  const caseData = req.caseData as Case;

  try {
    // 支援計画と相談記録を並列取得
    const [plan, consultations] = await Promise.all([
      supportPlanRepo.getLatestSupportPlan(caseId),
      consultationRepo.listConsultations(caseId),
    ]);

    if (!plan) {
      res.status(400).json({ error: "支援計画書がありません。先に支援計画書を作成してください。" });
      return;
    }
    if (plan.status !== "confirmed") {
      res.status(400).json({ error: "支援計画書が確定されていません。先に支援計画書を確定してください。" });
      return;
    }

    const completedConsultations = consultations.filter((c) => c.aiStatus === "completed");
    if (completedConsultations.length === 0) {
      res.status(400).json({ error: "AI分析が完了した相談記録がありません。" });
      return;
    }

    // completedConsultationsのみ渡す（AI側でも再フィルタするが無駄な入力を減らす）
    const aiResult = await generateMonitoringDraft(caseData, plan, completedConsultations);

    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setMonth(nextDate.getMonth() + 1);

    const sheet = await monitoringRepo.createMonitoringSheet(caseId, {
      supportPlanId: plan.id!,
      staffId: req.user!.staffId,
      status: "draft",
      monitoringDate: formatDateString(today),
      overallEvaluation: aiResult.overallEvaluation,
      goalEvaluations: aiResult.goalEvaluations,
      environmentChanges: aiResult.environmentChanges,
      clientFeedback: aiResult.clientFeedback,
      specialNotes: aiResult.specialNotes,
      nextMonitoringDate: formatDateString(nextDate),
    });

    res.status(201).json(sheet);
  } catch (err) {
    console.error("Monitoring draft generation failed", (err as Error).message);
    res.status(500).json({ error: "モニタリングシートの生成に失敗しました" });
  }
});

// GET /api/cases/:id/monitoring — 最新のモニタリングシート取得
monitoringRouter.get("/", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  try {
    const sheet = await monitoringRepo.getLatestMonitoringSheet(caseId);
    if (!sheet) {
      res.status(404).json({ error: "モニタリングシートが見つかりません" });
      return;
    }
    res.json(sheet);
  } catch (err) {
    console.error("Get monitoring sheet failed", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:id/monitoring/list — 全履歴取得
monitoringRouter.get("/list", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  try {
    const sheets = await monitoringRepo.listMonitoringSheets(caseId);
    res.json(sheets);
  } catch (err) {
    console.error("List monitoring sheets failed", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/cases/:id/monitoring/:sheetId — 編集・確定
monitoringRouter.patch("/:sheetId", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  const sheetId = paramStr(req.params.sheetId);
  const parsed = validate(updateMonitoringSheetSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const sheet = await monitoringRepo.updateMonitoringSheet(caseId, sheetId, parsed.data);
    res.json(sheet);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes("Cannot edit")) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("Update monitoring sheet failed", message);
    res.status(500).json({ error: "Internal server error" });
  }
});
