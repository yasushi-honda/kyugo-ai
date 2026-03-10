import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { SupportPlan } from "../types.js";

function supportPlansRef(caseId: string) {
  return firestore.collection("cases").doc(caseId).collection("supportPlans");
}

export async function createSupportPlan(
  caseId: string,
  data: Omit<SupportPlan, "id" | "caseId" | "createdAt" | "updatedAt" | "confirmedAt">,
): Promise<SupportPlan> {
  const now = Timestamp.now();
  const planData: Omit<SupportPlan, "id"> = {
    ...data,
    caseId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await supportPlansRef(caseId).add(planData);
  return { id: docRef.id, ...planData };
}

export async function getSupportPlan(caseId: string, planId: string): Promise<SupportPlan | null> {
  const doc = await supportPlansRef(caseId).doc(planId).get();
  if (!doc.exists) return null;
  return { id: doc.id, caseId, ...doc.data() } as SupportPlan;
}

export async function listSupportPlans(caseId: string): Promise<SupportPlan[]> {
  const snapshot = await supportPlansRef(caseId).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, caseId, ...doc.data() }) as SupportPlan);
}

export async function getLatestSupportPlan(caseId: string): Promise<SupportPlan | null> {
  const snapshot = await supportPlansRef(caseId).orderBy("createdAt", "desc").limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, caseId, ...doc.data() } as SupportPlan;
}

export async function updateSupportPlan(
  caseId: string,
  planId: string,
  data: Partial<Pick<SupportPlan, "overallPolicy" | "goals" | "specialNotes" | "planStartDate" | "nextReviewDate" | "status">>,
): Promise<SupportPlan> {
  const current = await getSupportPlan(caseId, planId);
  if (!current) throw new Error(`SupportPlan ${planId} not found`);
  if (current.status === "confirmed") {
    throw new Error("Cannot edit a confirmed support plan");
  }

  const now = Timestamp.now();
  const update: Record<string, unknown> = { ...data, updatedAt: now };

  // 確定時にconfirmedAtを設定
  if (data.status === "confirmed") {
    update.confirmedAt = now;
  }

  await supportPlansRef(caseId).doc(planId).update(update);
  return { ...current, ...update, updatedAt: now } as SupportPlan;
}
