import { Timestamp } from "@google-cloud/firestore";
import { logger } from "../utils/logger.js";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation, analyzeAudioConsultation } from "./ai.js";
import { downloadAudio } from "./audio-storage.js";
import { isTransientError } from "../utils/error.js";
import { AI_RETRY_CONFIG } from "../types.js";

export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  expired: number;
  recovered: number;
  recoveredPending: number;
}

export async function retryPendingConsultations(): Promise<RetryResult> {
  const result: RetryResult = { processed: 0, succeeded: 0, failed: 0, expired: 0, recovered: 0, recoveredPending: 0 };

  // pending のまま stuck したレコードを復旧（fire-and-forget失敗対策）
  result.recoveredPending = await consultationRepo.recoverStuckPendingConsultations();

  // retrying のまま stuck したレコードを復旧（プロセスクラッシュ対策）
  result.recovered = await consultationRepo.recoverStuckRetryingConsultations();

  // max retry超過分をerrorに遷移
  result.expired = await consultationRepo.expireRetryPendingConsultations();

  // リトライ対象を取得
  const pending = await consultationRepo.listRetryPendingConsultations();
  if (pending.length === 0) return result;

  const menus = await supportMenuRepo.listSupportMenus();

  for (const consultation of pending) {
    result.processed++;
    const currentRetryCount = (consultation.aiRetryCount ?? 0) + 1;

    // 並行実行防止: retrying に遷移してからAI呼び出し
    try {
      await consultationRepo.updateConsultationAIStatus(
        consultation.caseId,
        consultation.id!,
        "retrying",
      );
    } catch (lockErr) {
      logger.error("Failed to lock consultation as retrying", { consultationId: consultation.id, error: String(lockErr) });
      result.failed++;
      continue;
    }

    try {
      let summary: string;
      let suggestedSupports: { menuId: string; menuName: string; reason: string; relevanceScore: number }[];
      let transcript: string | undefined;

      if (consultation.audioStoragePath) {
        // 音声ファイルがGCSに永続化されている場合、音声ベースで再解析
        const audio = await downloadAudio(consultation.audioStoragePath);
        const aiResult = await analyzeAudioConsultation(audio.buffer, audio.mimeType, consultation.content, menus);
        summary = aiResult.summary;
        suggestedSupports = aiResult.suggestedSupports;
        transcript = aiResult.transcript;
      } else {
        // テキストのみの相談（音声なし）
        const aiResult = await analyzeConsultation(
          { content: consultation.content, transcript: consultation.transcript },
          menus,
        );
        summary = aiResult.summary;
        suggestedSupports = aiResult.suggestedSupports;
      }

      await consultationRepo.updateConsultationAIResults(
        consultation.caseId,
        consultation.id!,
        summary,
        suggestedSupports,
        transcript,
      );
      result.succeeded++;
      logger.info("AI retry succeeded", { consultationId: consultation.id, attempt: currentRetryCount });
    } catch (err) {
      logger.error("AI retry failed", { consultationId: consultation.id, attempt: currentRetryCount, error: String(err) });

      const isTransient = isTransientError(err);
      const newStatus = isTransient && currentRetryCount < AI_RETRY_CONFIG.maxRetryCount
        ? "retry_pending" as const
        : "error" as const;

      // 指数バックオフ: baseDelay * 2^retryCount
      const nextRetryAt = newStatus === "retry_pending"
        ? Timestamp.fromMillis(Date.now() + AI_RETRY_CONFIG.baseDelayMs * Math.pow(2, currentRetryCount))
        : undefined;

      // 状態復旧を最優先（error-handling.md準拠）
      try {
        await consultationRepo.updateConsultationAIStatus(
          consultation.caseId,
          consultation.id!,
          newStatus,
          (err as Error).message,
          currentRetryCount,
          nextRetryAt,
        );
      } catch (statusErr) {
        logger.error("Failed to update aiStatus", { consultationId: consultation.id, error: String(statusErr) });
      }
      result.failed++;
    }
  }

  return result;
}
