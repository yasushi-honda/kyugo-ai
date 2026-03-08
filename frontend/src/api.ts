import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
    throw new Error(err.error ?? `HTTP ${res.status}`);
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

export interface UserInfo {
  uid: string;
  email: string;
  role: "admin" | "staff";
  staffId: string;
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
    request<Consultation & { transcript: string; summary: string; suggestedSupports: SuggestedSupport[] }>(
      `/api/cases/${caseId}/consultations/audio`,
      { method: "POST", body: formData },
    ),

  listSupportMenus: () =>
    request<SupportMenu[]>("/api/support-menus"),
};
