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
  audioStoragePath?: string;
  audioMimeType?: string;
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
  disabled: boolean;
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

// 個別支援計画書
export type SupportPlanStatus = "draft" | "confirmed";

export interface SupportPlanGoal {
  area: string; // 支援領域（例: 日常生活、健康管理、社会参加）
  longTermGoal: string; // 長期目標
  shortTermGoal: string; // 短期目標
  supports: string[]; // 具体的な支援内容
  frequency: string; // 支援頻度
  responsible: string; // 担当者・機関
}

export interface SupportPlan {
  id?: string;
  caseId: string;
  staffId: string; // 作成者
  status: SupportPlanStatus;
  clientName: string;
  clientId: string;
  overallPolicy: string; // 全体的な支援方針
  goals: SupportPlanGoal[]; // 目標・支援内容一覧
  specialNotes: string; // 特記事項
  planStartDate: string; // 計画開始日（YYYY-MM-DD）
  nextReviewDate: string; // 次回見直し日（YYYY-MM-DD）
  confirmedAt?: Timestamp; // 確定日時
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// AI生成の支援計画下書きレスポンス
export interface AISupportPlanResult {
  overallPolicy: string;
  goals: SupportPlanGoal[];
  specialNotes: string;
}

// モニタリングシート
export type MonitoringProgress = "improved" | "maintained" | "declined" | "not_started";

export interface MonitoringGoalEvaluation {
  area: string; // 支援領域（SupportPlanGoalのareaと対応）
  longTermGoal: string; // 長期目標（参照用）
  shortTermGoal: string; // 短期目標（参照用）
  progress: MonitoringProgress; // 進捗状況
  evaluation: string; // 達成状況の評価コメント
  nextAction: string; // 今後の対応方針
}

export interface MonitoringSheet {
  id?: string;
  caseId: string;
  supportPlanId: string; // 紐付く支援計画
  staffId: string; // 作成者
  status: SupportPlanStatus; // draft | confirmed（SupportPlanStatusを再利用）
  monitoringDate: string; // YYYY-MM-DD
  overallEvaluation: string; // 全体評価
  goalEvaluations: MonitoringGoalEvaluation[]; // 目標ごとの進捗評価
  environmentChanges: string; // 生活環境の変化
  clientFeedback: string; // 本人の意向・感想
  specialNotes: string; // 特記事項
  nextMonitoringDate: string; // 次回モニタリング予定
  confirmedAt?: Timestamp; // 確定日時
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// AI生成のモニタリングシート下書きレスポンス
export interface AIMonitoringResult {
  overallEvaluation: string;
  goalEvaluations: MonitoringGoalEvaluation[];
  environmentChanges: string;
  clientFeedback: string;
  specialNotes: string;
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
