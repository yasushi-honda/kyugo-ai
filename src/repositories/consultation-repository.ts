import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { Consultation } from "../types.js";

function consultationsRef(caseId: string) {
  return firestore.collection("cases").doc(caseId).collection("consultations");
}

export async function createConsultation(
  caseId: string,
  data: Omit<Consultation, "id" | "caseId" | "createdAt" | "updatedAt" | "summary" | "suggestedSupports">,
): Promise<Consultation> {
  const now = Timestamp.now();
  const consultationData: Omit<Consultation, "id"> = {
    ...data,
    caseId,
    summary: "",
    suggestedSupports: [],
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
    updatedAt: Timestamp.now(),
  });
}
