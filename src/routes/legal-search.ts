import { Router, Request, Response } from "express";
import * as legalSearchRepo from "../repositories/legal-search-repository.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import { searchLegalInfo } from "../services/ai.js";
import { requireCaseAccess } from "../middleware/authz.js";
import { aiLimiter } from "../middleware/rate-limit.js";
import { createLegalSearchSchema } from "../schemas/case.js";
import { paramStr, validate } from "./utils.js";

export const legalSearchRouter = Router({ mergeParams: true });

// 全エンドポイントでケースアクセス権を確認
legalSearchRouter.use(requireCaseAccess);

// POST /api/cases/:id/legal-search — 法令検索実行
legalSearchRouter.post("/", aiLimiter, async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  const parsed = validate(createLegalSearchSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    // 相談記録を収集して検索コンテキストに使用（直近20件・4000文字以内）
    const consultations = await consultationRepo.listConsultations(caseId);
    const completed = consultations
      .filter((c) => c.aiStatus === "completed" && c.summary)
      .slice(-20);
    let summaries = "";
    for (const c of completed) {
      const line = `[${c.consultationType}] ${c.summary}\n`;
      if (summaries.length + line.length > 4000) break;
      summaries += line;
    }

    const aiResult = await searchLegalInfo(parsed.data.query, summaries);

    // 結果をFirestoreに保存
    const result = await legalSearchRepo.createLegalSearch(caseId, {
      staffId: req.user!.staffId,
      query: parsed.data.query,
      references: aiResult.references,
      legalBasis: aiResult.legalBasis,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Legal search failed", (err as Error).message);
    res.status(500).json({ error: "法令検索に失敗しました" });
  }
});

// GET /api/cases/:id/legal-search — 検索履歴一覧
legalSearchRouter.get("/", async (req: Request, res: Response) => {
  const caseId = paramStr(req.params.id);
  try {
    const results = await legalSearchRepo.listLegalSearches(caseId);
    res.json(results);
  } catch (err) {
    console.error("List legal searches failed", (err as Error).message);
    res.status(500).json({ error: "検索履歴の取得に失敗しました" });
  }
});
