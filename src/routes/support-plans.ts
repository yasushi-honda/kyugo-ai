import { Router, Request, Response } from "express";
import type { ZodType } from "zod";
import * as supportPlanRepo from "../repositories/support-plan-repository.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { generateSupportPlanDraft } from "../services/ai.js";
import { requireCaseAccess } from "../middleware/authz.js";
import { updateSupportPlanSchema } from "../schemas/case.js";
import { Case } from "../types.js";

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function validate<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
}

export const supportPlansRouter = Router({ mergeParams: true });

// 全エンドポイントでケースアクセス権を確認
supportPlansRouter.use(requireCaseAccess);

// POST /api/cases/:id/support-plan/draft — AI下書き生成
supportPlansRouter.post("/draft", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  const caseData = req.caseData as Case;

  try {
    // 相談記録と支援メニューを収集
    const [consultations, menus] = await Promise.all([
      consultationRepo.listConsultations(caseId),
      supportMenuRepo.listSupportMenus(),
    ]);

    const completedConsultations = consultations.filter((c) => c.aiStatus === "completed");
    if (completedConsultations.length === 0) {
      res.status(400).json({ error: "AI分析が完了した相談記録がありません。先に相談記録を作成してください。" });
      return;
    }

    // AI生成
    const aiResult = await generateSupportPlanDraft(caseData, consultations, menus);

    // 計画開始日: 今日、次回見直し日: 3ヶ月後
    const today = new Date();
    const reviewDate = new Date(today);
    reviewDate.setMonth(reviewDate.getMonth() + 3);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const plan = await supportPlanRepo.createSupportPlan(caseId, {
      staffId: req.user!.staffId,
      status: "draft",
      clientName: caseData.clientName,
      clientId: caseData.clientId,
      overallPolicy: aiResult.overallPolicy,
      goals: aiResult.goals,
      specialNotes: aiResult.specialNotes,
      planStartDate: formatDate(today),
      nextReviewDate: formatDate(reviewDate),
    });

    res.status(201).json(plan);
  } catch (err) {
    console.error("Support plan draft generation failed", (err as Error).message);
    res.status(500).json({ error: "支援計画書の生成に失敗しました" });
  }
});

// GET /api/cases/:id/support-plan — 最新の計画書取得
supportPlansRouter.get("/", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  try {
    const plan = await supportPlanRepo.getLatestSupportPlan(caseId);
    if (!plan) {
      res.status(404).json({ error: "支援計画書が見つかりません" });
      return;
    }
    res.json(plan);
  } catch (err) {
    console.error("Get support plan failed", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:id/support-plan/list — 全履歴取得
supportPlansRouter.get("/list", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  try {
    const plans = await supportPlanRepo.listSupportPlans(caseId);
    res.json(plans);
  } catch (err) {
    console.error("List support plans failed", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/cases/:id/support-plan/:planId — 編集・確定
supportPlansRouter.patch("/:planId", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  const planId = paramStr(req.params.planId);
  const parsed = validate(updateSupportPlanSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const plan = await supportPlanRepo.updateSupportPlan(caseId, planId, parsed.data);
    res.json(plan);
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
    console.error("Update support plan failed", message);
    res.status(500).json({ error: "Internal server error" });
  }
});
