import { Router, Request, Response } from "express";
import multer from "multer";
import * as caseRepo from "../repositories/case-repository.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation } from "../services/ai.js";
import { CaseStatus, ConsultationType, SUPPORTED_AUDIO_MIME_TYPES } from "../types.js";
import { Timestamp } from "@google-cloud/firestore";

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

// POST /api/cases - ケース作成
casesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { clientName, clientId, dateOfBirth, householdInfo, incomeInfo, assignedStaffId } = req.body;
    if (!clientName || !clientId || !assignedStaffId) {
      res.status(400).json({ error: "clientName, clientId, assignedStaffId are required" });
      return;
    }
    const created = await caseRepo.createCase({
      clientName,
      clientId,
      dateOfBirth: Timestamp.fromDate(new Date(dateOfBirth)),
      householdInfo: householdInfo ?? {},
      incomeInfo: incomeInfo ?? {},
      assignedStaffId,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases/:id - ケース取得
casesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const caseData = await caseRepo.getCase(paramStr(req.params.id));
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases?staffId=xxx&status=active - ケース一覧
casesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const staffId = String(req.query.staffId ?? "");
    if (!staffId) {
      res.status(400).json({ error: "staffId query parameter is required" });
      return;
    }
    const status = req.query.status ? String(req.query.status) as CaseStatus : undefined;
    const cases = await caseRepo.listCasesByStaff(staffId, status);
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/cases/:id/status - ステータス変更
casesRouter.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }
    const updated = await caseRepo.updateCaseStatus(paramStr(req.params.id), status);
    res.json(updated);
  } catch (err) {
    const message = (err as Error).message;
    const statusCode = message.includes("not found") ? 404 : message.includes("Invalid") ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// POST /api/cases/:id/consultations - 相談記録作成 + AI分析
casesRouter.post("/:id/consultations", async (req: Request, res: Response) => {
  try {
    const caseId = paramStr(req.params.id);
    const caseData = await caseRepo.getCase(caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const { staffId, content, transcript, consultationType } = req.body;
    if (!staffId || !content || !consultationType) {
      res.status(400).json({ error: "staffId, content, consultationType are required" });
      return;
    }

    const consultation = await consultationRepo.createConsultation(caseId, {
      staffId,
      content,
      transcript: transcript ?? "",
      consultationType: consultationType as ConsultationType,
    });

    // AI分析を非同期で実行（レスポンスは先に返す）
    const menus = await supportMenuRepo.listSupportMenus();
    analyzeConsultation({ content, transcript: transcript ?? "" }, menus)
      .then(async (aiResult) => {
        await consultationRepo.updateConsultationAIResults(
          caseId,
          consultation.id!,
          aiResult.summary,
          aiResult.suggestedSupports,
        );
        console.log(`AI analysis completed for consultation ${consultation.id}`);
      })
      .catch((err) => {
        console.error(`AI analysis failed for consultation ${consultation.id}:`, err);
      });

    res.status(201).json(consultation);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/cases/:id/consultations/audio - 音声付き相談記録作成（1 API callで文字起こし+要約+提案）
casesRouter.post("/:id/consultations/audio", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    const caseId = paramStr(req.params.id);
    const caseData = await caseRepo.getCase(caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "audio file is required" });
      return;
    }

    const { staffId, context, consultationType } = req.body;
    if (!staffId || !consultationType) {
      res.status(400).json({ error: "staffId, consultationType are required" });
      return;
    }

    // Gemini 2.5 Flash で音声分析（文字起こし + 要約 + 支援提案を1回で）
    const menus = await supportMenuRepo.listSupportMenus();
    const aiResult = await analyzeAudioConsultation(
      file.buffer,
      file.mimetype,
      context ?? "",
      menus,
    );

    // 分析結果を含めて相談記録を作成
    const consultationData = {
      staffId,
      content: context ?? "",
      transcript: aiResult.transcript,
      consultationType: consultationType as ConsultationType,
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

// GET /api/cases/:id/consultations - 相談記録一覧
casesRouter.get("/:id/consultations", async (req: Request, res: Response) => {
  try {
    const consultations = await consultationRepo.listConsultations(paramStr(req.params.id));
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/cases/:id/consultations/:consultationId - 相談記録詳細
casesRouter.get("/:id/consultations/:consultationId", async (req: Request, res: Response) => {
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
