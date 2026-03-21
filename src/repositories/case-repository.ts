import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { Case, CaseStatus, VALID_STATUS_TRANSITIONS } from "../types.js";

const COLLECTION = "cases";

function casesRef() {
  return firestore.collection(COLLECTION);
}

export async function createCase(data: Omit<Case, "id" | "createdAt" | "updatedAt" | "status">): Promise<Case> {
  const now = Timestamp.now();
  const caseData: Omit<Case, "id"> = {
    ...data,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await casesRef().add(caseData);
  return { id: docRef.id, ...caseData };
}

export async function getCase(id: string): Promise<Case | null> {
  const doc = await casesRef().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Case;
}

export async function listCasesByStaff(staffId: string, status?: CaseStatus): Promise<Case[]> {
  let query = casesRef().where("assignedStaffId", "==", staffId);
  if (status) {
    query = query.where("status", "==", status);
  }
  const snapshot = await query.orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Case);
}

export async function listAllCases(status?: CaseStatus): Promise<Case[]> {
  let query: FirebaseFirestore.Query = casesRef();
  if (status) {
    query = query.where("status", "==", status);
  }
  const snapshot = await query.orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Case);
}

export async function updateCaseStatus(id: string, newStatus: CaseStatus): Promise<Case> {
  const docRef = casesRef().doc(id);

  return firestore.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) throw new Error(`Case ${id} not found`);

    const current = { id: doc.id, ...doc.data() } as Case;
    const allowed = VALID_STATUS_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${current.status} → ${newStatus}`);
    }

    const now = Timestamp.now();
    tx.update(docRef, { status: newStatus, updatedAt: now });
    return { ...current, status: newStatus, updatedAt: now };
  });
}
