import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";
import { LegalSearchResult } from "../types.js";

function legalSearchesRef(caseId: string) {
  return firestore.collection("cases").doc(caseId).collection("legalSearches");
}

export async function createLegalSearch(
  caseId: string,
  data: Omit<LegalSearchResult, "id" | "caseId" | "createdAt">,
): Promise<LegalSearchResult> {
  const now = Timestamp.now();
  const docData: Omit<LegalSearchResult, "id"> = {
    ...data,
    caseId,
    createdAt: now,
  };
  const docRef = await legalSearchesRef(caseId).add(docData);
  return { id: docRef.id, ...docData };
}

export async function listLegalSearches(caseId: string): Promise<LegalSearchResult[]> {
  const snapshot = await legalSearchesRef(caseId).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, caseId, ...doc.data() }) as LegalSearchResult);
}
