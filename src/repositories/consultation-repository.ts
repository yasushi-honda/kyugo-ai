import { FieldValue, Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { Consultation, AI_RETRY_CONFIG } from "../types.js";

function consultationsRef(caseId: string) {
  return firestore.collection("cases").doc(caseId).collection("consultations");
}

export async function createConsultation(
  caseId: string,
  data: Omit<Consultation, "id" | "caseId" | "createdAt" | "updatedAt" | "summary" | "suggestedSupports" | "aiStatus" | "aiErrorMessage" | "aiRetryCount">,
): Promise<Consultation> {
  const now = Timestamp.now();
  const consultationData: Omit<Consultation, "id"> = {
    ...data,
    caseId,
    summary: "",
    suggestedSupports: [],
    aiStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await consultationsRef(caseId).add(consultationData);
  return { id: docRef.id, ...consultationData };
}

export async function getConsultation(caseId: string, consultationId: string): Promise<Consultation | null> {
  const doc = await consultationsRef(caseId).doc(consultationId).get();
  if (!doc.exists) return null;
  return { id: doc.id, caseId, ...doc.data() } as Consultation;
}

export async function listConsultations(caseId: string): Promise<Consultation[]> {
  const snapshot = await consultationsRef(caseId).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, caseId, ...doc.data() }) as Consultation);
}

export async function updateConsultationAIResults(
  caseId: string,
  consultationId: string,
  summary: string,
  suggestedSupports: Consultation["suggestedSupports"],
): Promise<void> {
  await consultationsRef(caseId).doc(consultationId).update({
    summary,
    suggestedSupports,
    aiStatus: "completed",
    aiErrorMessage: FieldValue.delete(),
    aiRetryCount: FieldValue.delete(),
    nextRetryAt: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}

export async function updateConsultationAIResultsWithTranscript(
  caseId: string,
  consultationId: string,
  summary: string,
  suggestedSupports: Consultation["suggestedSupports"],
  transcript: string,
): Promise<void> {
  await consultationsRef(caseId).doc(consultationId).update({
    summary,
    suggestedSupports,
    transcript,
    aiStatus: "completed",
    aiErrorMessage: FieldValue.delete(),
    aiRetryCount: FieldValue.delete(),
    nextRetryAt: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}

export async function updateConsultationAIStatus(
  caseId: string,
  consultationId: string,
  aiStatus: Consultation["aiStatus"],
  aiErrorMessage?: string,
  aiRetryCount?: number,
  nextRetryAt?: Timestamp,
): Promise<void> {
  const update: Record<string, unknown> = {
    aiStatus,
    updatedAt: Timestamp.now(),
  };
  if (aiErrorMessage !== undefined) update.aiErrorMessage = aiErrorMessage;
  if (aiRetryCount !== undefined) update.aiRetryCount = aiRetryCount;
  if (nextRetryAt !== undefined) update.nextRetryAt = nextRetryAt;
  await consultationsRef(caseId).doc(consultationId).update(update);
}

// retry_pending かつ nextRetryAt <= now のconsultationを全caseから取得
export async function listRetryPendingConsultations(): Promise<Consultation[]> {
  const now = Timestamp.now();
  const casesSnapshot = await firestore.collection("cases").get();
  const results: Consultation[] = [];

  for (const caseDoc of casesSnapshot.docs) {
    const snapshot = await consultationsRef(caseDoc.id)
      .where("aiStatus", "==", "retry_pending")
      .where("aiRetryCount", "<", AI_RETRY_CONFIG.maxRetryCount)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Consultation;
      // nextRetryAt が未設定または現在時刻以前のものだけ対象
      if (!data.nextRetryAt || data.nextRetryAt.toMillis() <= now.toMillis()) {
        results.push({ ...data, id: doc.id, caseId: caseDoc.id });
      }
    }
  }

  return results;
}

// retrying のまま stuck したconsultationを retry_pending に差し戻す（プロセスクラッシュ復旧）
const STUCK_RETRYING_THRESHOLD_MS = AI_RETRY_CONFIG.baseDelayMs * 2; // 10分

export async function recoverStuckRetryingConsultations(): Promise<number> {
  const threshold = Timestamp.fromMillis(Date.now() - STUCK_RETRYING_THRESHOLD_MS);
  const casesSnapshot = await firestore.collection("cases").get();
  let recoveredCount = 0;

  for (const caseDoc of casesSnapshot.docs) {
    const snapshot = await consultationsRef(caseDoc.id)
      .where("aiStatus", "==", "retrying")
      .where("updatedAt", "<", threshold)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      await doc.ref.update({
        aiStatus: "retry_pending",
        aiErrorMessage: "Recovered from stuck retrying state",
        aiRetryCount: ((data.aiRetryCount as number) ?? 0) + 1,
        updatedAt: Timestamp.now(),
      });
      recoveredCount++;
    }
  }

  return recoveredCount;
}

// pending のまま stuck したconsultationを retry_pending に差し戻す（fire-and-forget失敗対策）
const STUCK_PENDING_THRESHOLD_MS = AI_RETRY_CONFIG.baseDelayMs * 2; // 10分

export async function recoverStuckPendingConsultations(): Promise<number> {
  const threshold = Timestamp.fromMillis(Date.now() - STUCK_PENDING_THRESHOLD_MS);
  const casesSnapshot = await firestore.collection("cases").get();
  let recoveredCount = 0;

  for (const caseDoc of casesSnapshot.docs) {
    const snapshot = await consultationsRef(caseDoc.id)
      .where("aiStatus", "==", "pending")
      .where("createdAt", "<", threshold)
      .get();

    for (const doc of snapshot.docs) {
      await doc.ref.update({
        aiStatus: "retry_pending",
        aiErrorMessage: "Recovered from stuck pending state",
        aiRetryCount: 0,
        updatedAt: Timestamp.now(),
      });
      recoveredCount++;
    }
  }

  return recoveredCount;
}

// max retry超過のconsultationをerrorに遷移
export async function expireRetryPendingConsultations(): Promise<number> {
  const casesSnapshot = await firestore.collection("cases").get();
  let expiredCount = 0;

  for (const caseDoc of casesSnapshot.docs) {
    const snapshot = await consultationsRef(caseDoc.id)
      .where("aiStatus", "==", "retry_pending")
      .where("aiRetryCount", ">=", AI_RETRY_CONFIG.maxRetryCount)
      .get();

    for (const doc of snapshot.docs) {
      await doc.ref.update({
        aiStatus: "error",
        aiErrorMessage: `Max retry count (${AI_RETRY_CONFIG.maxRetryCount}) exceeded`,
        updatedAt: Timestamp.now(),
      });
      expiredCount++;
    }
  }

  return expiredCount;
}
