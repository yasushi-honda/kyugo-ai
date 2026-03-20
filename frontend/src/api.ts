import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      err.error ?? `HTTP ${res.status}`,
      err.code ?? "UNKNOWN",
      res.status,
    );
  }
  return res.json();
}

export interface Case {
  id: string;
  clientName: string;
  clientId: string;
  dateOfBirth: { _seconds: number };
  householdInfo: Record<string, string>;
  incomeInfo: Record<string, string>;
  status: "active" | "referred" | "closed";
  assignedStaffId: string;
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

export interface SuggestedSupport {
  menuId: string;
  menuName: string;
  reason: string;
  relevanceScore: number;
}

export interface Consultation {
  id: string;
  caseId: string;
  staffId: string;
  content: string;
  transcript: string;
  summary: string;
  suggestedSupports: SuggestedSupport[];
  consultationType: "visit" | "counter" | "phone" | "online";
  aiStatus: "pending" | "completed" | "retry_pending" | "retrying" | "error";
  aiErrorMessage?: string;
  editedAt?: { _seconds: number } | null;
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

export interface SupportMenu {
  id: string;
  name: string;
  category: string;
  eligibility: string;
  description: string;
}

export interface StaffSummary {
  id: string;
  name: string;
}

export interface UserInfo {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  staffId: string;
}

export interface StaffDetail {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  disabled: boolean;
  createdAt: { _seconds: number } | null;
}

export interface SupportPlanGoal {
  area: string;
  longTermGoal: string;
  shortTermGoal: string;
  supports: string[];
  frequency: string;
  responsible: string;
}

export interface SupportPlan {
  id: string;
  caseId: string;
  staffId: string;
  status: "draft" | "confirmed";
  clientName: string;
  clientId: string;
  overallPolicy: string;
  goals: SupportPlanGoal[];
  specialNotes: string;
  planStartDate: string;
  nextReviewDate: string;
  confirmedAt?: { _seconds: number };
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

export interface LegalReference {
  lawName: string;
  article: string;
  summary: string;
  sourceUrl?: string;
  relevance: string;
}

export interface LegalSearchResult {
  id: string;
  caseId: string;
  staffId: string;
  query: string;
  references: LegalReference[];
  legalBasis: string;
  createdAt: { _seconds: number };
}

export interface MonitoringGoalEvaluation {
  area: string;
  longTermGoal: string;
  shortTermGoal: string;
  progress: "improved" | "maintained" | "declined" | "not_started";
  evaluation: string;
  nextAction: string;
}

export interface MonitoringSheet {
  id: string;
  caseId: string;
  supportPlanId: string;
  staffId: string;
  status: "draft" | "confirmed";
  monitoringDate: string;
  overallEvaluation: string;
  goalEvaluations: MonitoringGoalEvaluation[];
  environmentChanges: string;
  clientFeedback: string;
  specialNotes: string;
  nextMonitoringDate: string;
  confirmedAt?: { _seconds: number };
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

/** StaffSummary[] → { [id]: name } マップに変換 */
export function buildStaffMap(staff: StaffSummary[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of staff) { map[s.id] = s.name; }
  return map;
}

export const api = {
  getMe: () => request<UserInfo>("/api/me"),

  listCases: () =>
    request<Case[]>("/api/cases"),

  getCase: (id: string) =>
    request<Case>(`/api/cases/${id}`),

  createCase: (data: {
    clientName: string;
    clientId: string;
    dateOfBirth: string;
  }) => request<Case>("/api/cases", { method: "POST", body: JSON.stringify(data) }),

  updateCaseStatus: (id: string, status: string) =>
    request<Case>(`/api/cases/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  listConsultations: (caseId: string) =>
    request<Consultation[]>(`/api/cases/${caseId}/consultations`),

  createConsultation: (caseId: string, data: {
    content: string;
    consultationType: string;
  }) => request<Consultation>(`/api/cases/${caseId}/consultations`, {
    method: "POST",
    body: JSON.stringify(data),
  }),

  createAudioConsultation: (caseId: string, formData: FormData) =>
    request<Consultation>(
      `/api/cases/${caseId}/consultations/audio`,
      { method: "POST", body: formData },
    ),

  getConsultation: (caseId: string, consultationId: string) =>
    request<Consultation>(`/api/cases/${caseId}/consultations/${consultationId}`),

  updateConsultation: (caseId: string, consultationId: string, data: { content?: string; transcript?: string }) =>
    request<Consultation>(`/api/cases/${caseId}/consultations/${consultationId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteConsultation: async (caseId: string, consultationId: string) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/consultations/${consultationId}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(err.error ?? `HTTP ${res.status}`, err.code ?? "UNKNOWN", res.status);
    }
  },

  listStaff: () =>
    request<StaffSummary[]>("/api/staff"),

  listSupportMenus: () =>
    request<SupportMenu[]>("/api/support-menus"),

  getAllowedEmails: () =>
    request<{ emails: string[]; domains: string[] }>("/api/admin-settings/allowed-emails"),

  updateAllowedEmails: (data: { emails: string[]; domains: string[] }) =>
    request<{ emails: string[]; domains: string[] }>("/api/admin-settings/allowed-emails", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  listAdminStaff: () =>
    request<StaffDetail[]>("/api/admin-settings/staff"),

  updateStaff: (id: string, data: { role?: "admin" | "staff"; disabled?: boolean }) =>
    request<StaffDetail>(`/api/admin-settings/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // 支援計画書
  generateSupportPlanDraft: (caseId: string) =>
    request<SupportPlan>(`/api/cases/${caseId}/support-plan/draft`, { method: "POST" }),

  getSupportPlan: (caseId: string) =>
    request<SupportPlan>(`/api/cases/${caseId}/support-plan`),

  updateSupportPlan: (caseId: string, planId: string, data: Partial<SupportPlan>) =>
    request<SupportPlan>(`/api/cases/${caseId}/support-plan/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // モニタリングシート
  generateMonitoringDraft: (caseId: string) =>
    request<MonitoringSheet>(`/api/cases/${caseId}/monitoring/draft`, { method: "POST" }),

  getMonitoringSheet: (caseId: string) =>
    request<MonitoringSheet>(`/api/cases/${caseId}/monitoring`),

  updateMonitoringSheet: (caseId: string, sheetId: string, data: Partial<MonitoringSheet>) =>
    request<MonitoringSheet>(`/api/cases/${caseId}/monitoring/${sheetId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // 法令検索
  searchLegalInfo: (caseId: string, query: string) =>
    request<LegalSearchResult>(`/api/cases/${caseId}/legal-search`, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  listLegalSearches: (caseId: string) =>
    request<LegalSearchResult[]>(`/api/cases/${caseId}/legal-search`),
};
