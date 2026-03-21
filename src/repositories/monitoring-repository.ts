import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { MonitoringSheet } from "../types.js";

function monitoringSheetsRef(caseId: string) {
  return firestore.collection("cases").doc(caseId).collection("monitoringSheets");
}

export async function createMonitoringSheet(
  caseId: string,
  data: Omit<MonitoringSheet, "id" | "caseId" | "createdAt" | "updatedAt" | "confirmedAt">,
): Promise<MonitoringSheet> {
  const now = Timestamp.now();
  const sheetData: Omit<MonitoringSheet, "id"> = {
    ...data,
    caseId,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await monitoringSheetsRef(caseId).add(sheetData);
  return { id: docRef.id, ...sheetData };
}

export async function getMonitoringSheet(caseId: string, sheetId: string): Promise<MonitoringSheet | null> {
  const doc = await monitoringSheetsRef(caseId).doc(sheetId).get();
  if (!doc.exists) return null;
  return { id: doc.id, caseId, ...doc.data() } as MonitoringSheet;
}

export async function listMonitoringSheets(caseId: string): Promise<MonitoringSheet[]> {
  const snapshot = await monitoringSheetsRef(caseId).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, caseId, ...doc.data() }) as MonitoringSheet);
}

export async function getLatestMonitoringSheet(caseId: string): Promise<MonitoringSheet | null> {
  const snapshot = await monitoringSheetsRef(caseId).orderBy("createdAt", "desc").limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, caseId, ...doc.data() } as MonitoringSheet;
}

export async function updateMonitoringSheet(
  caseId: string,
  sheetId: string,
  data: Partial<Pick<MonitoringSheet, "overallEvaluation" | "goalEvaluations" | "environmentChanges" | "clientFeedback" | "specialNotes" | "monitoringDate" | "nextMonitoringDate" | "status">>,
): Promise<MonitoringSheet> {
  const docRef = monitoringSheetsRef(caseId).doc(sheetId);

  return firestore.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw new Error(`MonitoringSheet ${sheetId} not found`);

    const current = { id: doc.id, caseId, ...doc.data() } as MonitoringSheet;
    if (current.status === "confirmed") {
      throw new Error("Cannot edit a confirmed monitoring sheet");
    }

    const now = Timestamp.now();
    const update: Record<string, unknown> = { ...data, updatedAt: now };

    if (data.status === "confirmed") {
      update.confirmedAt = now;
    }

    tx.update(docRef, update);
    return { ...current, ...update, updatedAt: now } as MonitoringSheet;
  });
}
