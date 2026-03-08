import { Router, Request, Response } from "express";
import multer from "multer";
import type { ZodType } from "zod";
import * as caseRepo from "../repositories/case-repository.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation } from "../services/ai.js";
import { SUPPORTED_AUDIO_MIME_TYPES } from "../types.js";
import { Timestamp } from "@google-cloud/firestore";
import { requireCaseAccess } from "../middleware/authz.js";
import {
  createCaseSchema,
  updateCaseStatusSchema,
  createConsultationSchema,
  createAudioConsultationSchema,
} from "../schemas/case.js";

function validate<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
}

function isTransientError(err: unknown): boolean {
  const status = (err as { status?: number }).status ?? (err as { code?: number }).code;
  if (status === 429 || status === 503) return true;
  const message = (err as Error).message ?? "";
  return /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up/i.test(message);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB（Cloud Run 32MBリクエスト上限を考慮、ヘッダ・メタデータ分のマージン確保）
  fileFilter: (_req, file, cb) => {
    if (SUPPORTED_AUDIO_MIME_TYPES.includes(file.mimetype as never)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}. Supported: ${SUPPORTED_AUDIO_MIME_TYPES.join(", ")}`));
    }
  },
});

function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const casesRouter = Router();

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
        const cases = await caseRepo.listCasesByStaff(user.staffId);
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

// POST /api/cases/:id/consultations - 相談記録作成 + AI分析（staffIdはreq.userから強制）
casesRouter.post("/:id/consultations", requireCaseAccess, async (req: Request, res: Response) => {
  const parsed = validate(createConsultationSchema, req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const caseId = paramStr(req.params.id);
    const data = parsed.data;

    const consultation = await consultationRepo.createConsultation(caseId, {
      staffId: req.user!.staffId,
      content: data.content,
      transcript: data.transcript,
      consultationType: data.consultationType,
    });

    // AI分析を非同期で実行（レスポンスは先に返す）
    const menus = await supportMenuRepo.listSupportMenus();
    analyzeConsultation({ content: data.content, transcript: data.transcript }, menus)
      .then(async (aiResult) => {
        await consultationRepo.updateConsultationAIResults(
          caseId,
          consultation.id!,
          aiResult.summary,
          aiResult.suggestedSupports,
        );
        console.log(`AI analysis completed for consultation ${consultation.id}`);
      })
      .catch(async (err) => {
        console.error(`AI analysis failed for consultation ${consultation.id}:`, err);
        const isTransient = isTransientError(err);
        try {
          await consultationRepo.updateConsultationAIStatus(
            caseId,
            consultation.id!,
            isTransient ? "retry_pending" : "error",
            (err as Error).message,
            0,
          );
        } catch (statusErr) {
          console.error(`Failed to update aiStatus for consultation ${consultation.id}:`, statusErr);
        }
      });

    res.status(201).json(consultation);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/cases/:id/consultations/audio - 音声付き相談記録作成（staffIdはreq.userから強制）
casesRouter.post("/:id/consultations/audio", requireCaseAccess, upload.single("audio"), async (req: Request, res: Response) => {
  try {
    const caseId = paramStr(req.params.id);

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "audio file is required" });
      return;
    }

    const parsed = validate(createAudioConsultationSchema, req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const data = parsed.data;

    // Gemini 2.5 Flash で音声分析（文字起こし + 要約 + 支援提案を1回で）
    const menus = await supportMenuRepo.listSupportMenus();
    const aiResult = await analyzeAudioConsultation(
      file.buffer,
      file.mimetype,
      data.context,
      menus,
    );

    // 分析結果を含めて相談記録を作成
    const consultationData = {
      staffId: req.user!.staffId,
      content: data.context,
      transcript: aiResult.transcript,
      consultationType: data.consultationType,
    };
    const consultation = await consultationRepo.createConsultation(caseId, consultationData);

    // AI結果を即座に反映
    await consultationRepo.updateConsultationAIResults(
      caseId,
      consultation.id!,
      aiResult.summary,
      aiResult.suggestedSupports,
    );

    res.status(201).json({
      ...consultation,
      transcript: aiResult.transcript,
      summary: aiResult.summary,
      suggestedSupports: aiResult.suggestedSupports,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("Unsupported audio format")) {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// GET /api/cases/:id/consultations - 相談記録一覧（認可チェック済み）
casesRouter.get("/:id/consultations", requireCaseAccess, async (req: Request, res: Response) => {
  try {
    const consultations = await consultationRepo.listConsultations(paramStr(req.params.id));
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases/:id/consultations/:consultationId - 相談記録詳細（認可チェック済み）
casesRouter.get("/:id/consultations/:consultationId", requireCaseAccess, async (req: Request, res: Response) => {
  try {
    const consultation = await consultationRepo.getConsultation(paramStr(req.params.id), paramStr(req.params.consultationId));
    if (!consultation) {
      res.status(404).json({ error: "Consultation not found" });
      return;
    }
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
