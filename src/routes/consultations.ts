import { Router, Request, Response } from "express";
import multer from "multer";
import type { ZodType } from "zod";
import { Timestamp } from "@google-cloud/firestore";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation } from "../services/ai.js";
import { SUPPORTED_AUDIO_MIME_TYPES, AI_RETRY_CONFIG } from "../types.js";
import { isTransientError } from "../utils/error.js";
import { requireCaseAccess } from "../middleware/authz.js";
import {
  createConsultationSchema,
  createAudioConsultationSchema,
} from "../schemas/case.js";

function validate<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
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

// mergeParams: true で親ルートの :id パラメータにアクセス
export const consultationsRouter = Router({ mergeParams: true });

// POST /api/cases/:id/consultations - 相談記録作成 + AI分析（staffIdはreq.userから強制）
consultationsRouter.post("/", requireCaseAccess, async (req: Request, res: Response) => {
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

    // AI分析を完全非同期で実行（レスポンスは先に返す）
    supportMenuRepo.listSupportMenus()
      .then((menus) => analyzeConsultation({ content: data.content, transcript: data.transcript }, menus))
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
          const nextRetryAt = isTransient
            ? Timestamp.fromMillis(Date.now() + AI_RETRY_CONFIG.baseDelayMs)
            : undefined;
          await consultationRepo.updateConsultationAIStatus(
            caseId,
            consultation.id!,
            isTransient ? "retry_pending" : "error",
            (err as Error).message,
            0,
            nextRetryAt,
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
consultationsRouter.post("/audio", requireCaseAccess, upload.single("audio"), async (req: Request, res: Response) => {
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
consultationsRouter.get("/", requireCaseAccess, async (req: Request, res: Response) => {
  try {
    const consultations = await consultationRepo.listConsultations(paramStr(req.params.id));
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases/:id/consultations/:consultationId - 相談記録詳細（認可チェック済み）
consultationsRouter.get("/:consultationId", requireCaseAccess, async (req: Request, res: Response) => {
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
