import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { Consultation } from "../types.js";

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
    updatedAt: Timestamp.now(),
  });
}

export async function updateConsultationAIStatus(
  caseId: string,
  consultationId: string,
  aiStatus: Consultation["aiStatus"],
  aiErrorMessage?: string,
  aiRetryCount?: number,
): Promise<void> {
  const update: Record<string, unknown> = {
    aiStatus,
    updatedAt: Timestamp.now(),
  };
  if (aiErrorMessage !== undefined) update.aiErrorMessage = aiErrorMessage;
  if (aiRetryCount !== undefined) update.aiRetryCount = aiRetryCount;
  await consultationsRef(caseId).doc(consultationId).update(update);
}
