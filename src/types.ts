import { Timestamp } from "@google-cloud/firestore";

// 認証ユーザー情報（Firebase IDトークンから取得）
export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  staffId: string;
}

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

// AI分析の処理状態
export type AIStatus = "pending" | "completed" | "retry_pending" | "retrying" | "error";

// AIリトライ設定
export const AI_RETRY_CONFIG = {
  maxRetryCount: 3,
  baseDelayMs: 5 * 60 * 1000, // 5分
} as const;

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
  aiStatus: AIStatus;
  aiErrorMessage?: string;
  aiRetryCount?: number;
  nextRetryAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ConsultationType = "visit" | "counter" | "phone" | "online";

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

// 音声AI分析レスポンス（文字起こし含む）
export interface AudioAnalysisResult extends AISummaryResult {
  transcript: string;
}

// 対応する音声フォーマット
export const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/x-aac",
] as const;

export type SupportedAudioMimeType = (typeof SUPPORTED_AUDIO_MIME_TYPES)[number];
