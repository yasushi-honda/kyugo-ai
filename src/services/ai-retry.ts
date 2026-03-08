import { Timestamp } from "@google-cloud/firestore";
import * as consultationRepo from "../repositories/consultation-repository.js";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";
import { analyzeConsultation } from "./ai.js";
import { isTransientError } from "../routes/consultations.js";
import { AI_RETRY_CONFIG } from "../types.js";

export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  expired: number;
}

export async function retryPendingConsultations(): Promise<RetryResult> {
  const result: RetryResult = { processed: 0, succeeded: 0, failed: 0, expired: 0 };

  // max retry超過分をerrorに遷移
  result.expired = await consultationRepo.expireRetryPendingConsultations();

  // リトライ対象を取得
  const pending = await consultationRepo.listRetryPendingConsultations();
  if (pending.length === 0) return result;

  const menus = await supportMenuRepo.listSupportMenus();

  for (const consultation of pending) {
    result.processed++;
    const currentRetryCount = (consultation.aiRetryCount ?? 0) + 1;

    try {
      const aiResult = await analyzeConsultation(
        { content: consultation.content, transcript: consultation.transcript },
        menus,
      );

      await consultationRepo.updateConsultationAIResults(
        consultation.caseId,
        consultation.id!,
        aiResult.summary,
        aiResult.suggestedSupports,
      );
      result.succeeded++;
      console.log(`AI retry succeeded for consultation ${consultation.id} (attempt ${currentRetryCount})`);
    } catch (err) {
      console.error(`AI retry failed for consultation ${consultation.id} (attempt ${currentRetryCount}):`, err);

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
        console.error(`Failed to update aiStatus for consultation ${consultation.id}:`, statusErr);
      }
      result.failed++;
    }
  }

  return result;
}
