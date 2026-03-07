import { Timestamp } from "@google-cloud/firestore";

// ケースファイル（要支援者単位）
export interface Case {
  id?: string;
  clientName: string;
  clientId: string;
  dateOfBirth: Timestamp;
  householdInfo: Record<string, unknown>;
  incomeInfo: Record<string, unknown>;
  status: CaseStatus;
  assignedStaffId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CaseStatus = "active" | "referred" | "closed";

export const VALID_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  active: ["referred", "closed"],
  referred: ["active", "closed"],
  closed: [],
};

// 相談記録
export interface Consultation {
  id?: string;
  caseId: string;
  staffId: string;
  content: string;
  transcript: string;
  summary: string;
  suggestedSupports: SuggestedSupport[];
  consultationType: ConsultationType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ConsultationType = "visit" | "counter" | "phone";

export interface SuggestedSupport {
  menuId: string;
  menuName: string;
  reason: string;
  relevanceScore: number;
}

// 支援メニューマスタ
export interface SupportMenu {
  id?: string;
  name: string;
  category: string;
  eligibility: string;
  description: string;
  relatedLaws: string[];
  updatedAt: Timestamp;
}

// 職員情報
export interface Staff {
  id?: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  officeId: string;
  createdAt: Timestamp;
}

// AI サービスのレスポンス
export interface AISummaryResult {
  summary: string;
  suggestedSupports: SuggestedSupport[];
}
