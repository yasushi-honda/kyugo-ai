import { z } from "zod";

// 日付文字列バリデーション（YYYY-MM-DD形式 + 実在する日付）
const dateString = z
  .string({ error: "dateOfBirth must be a string" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD format" })
  .refine((val) => {
    const [y, m, d] = val.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, { error: "Invalid date" });

export const createCaseSchema = z.object({
  clientName: z.string({ error: "clientName is required" }).min(1, { error: "clientName is required" }).max(100),
  clientId: z.string({ error: "clientId is required" }).min(1, { error: "clientId is required" }).max(100),
  dateOfBirth: dateString,
  householdInfo: z.record(z.string(), z.unknown()).optional().default({}),
  incomeInfo: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateCaseStatusSchema = z.object({
  status: z.enum(["active", "referred", "closed"], {
    error: "status must be one of: active, referred, closed",
  }),
});

export const consultationTypeEnum = z.enum(["visit", "counter", "phone", "online"], {
  error: "consultationType must be one of: visit, counter, phone, online",
});

export const createConsultationSchema = z.object({
  content: z.string({ error: "content is required" }).min(1, { error: "content is required" }).max(50000),
  consultationType: consultationTypeEnum,
  transcript: z.string().max(100000).optional().default(""),
});

export const createAudioConsultationSchema = z.object({
  consultationType: consultationTypeEnum,
  context: z.string().max(10000).optional().default(""),
});

// 個別支援計画書
const supportPlanGoalSchema = z.object({
  area: z.string().min(1).max(100),
  longTermGoal: z.string().min(1).max(500),
  shortTermGoal: z.string().min(1).max(500),
  supports: z.array(z.string().min(1).max(500)).min(1).max(20),
  frequency: z.string().min(1).max(100),
  responsible: z.string().min(1).max(200),
});

export const updateSupportPlanSchema = z.object({
  overallPolicy: z.string().min(1).max(2000).optional(),
  goals: z.array(supportPlanGoalSchema).min(1).max(20).optional(),
  specialNotes: z.string().max(5000).optional(),
  planStartDate: dateString.optional(),
  nextReviewDate: dateString.optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
});

// モニタリングシート
const monitoringGoalEvaluationSchema = z.object({
  area: z.string().min(1).max(100),
  longTermGoal: z.string().min(1).max(500),
  shortTermGoal: z.string().min(1).max(500),
  progress: z.enum(["improved", "maintained", "declined", "not_started"]),
  evaluation: z.string().min(1).max(2000),
  nextAction: z.string().min(1).max(2000),
});

export const updateMonitoringSheetSchema = z.object({
  overallEvaluation: z.string().min(1).max(5000).optional(),
  goalEvaluations: z.array(monitoringGoalEvaluationSchema).min(1).max(20).optional(),
  environmentChanges: z.string().max(5000).optional(),
  clientFeedback: z.string().max(5000).optional(),
  specialNotes: z.string().max(5000).optional(),
  monitoringDate: dateString.optional(),
  nextMonitoringDate: dateString.optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
});

// 法令検索
export const createLegalSearchSchema = z.object({
  query: z.string({ error: "query is required" }).min(1, { error: "query is required" }).max(2000),
});

// 管理者設定: ログイン許可リスト
export const allowedEmailsSchema = z.object({
  emails: z.array(z.string().email({ error: "Invalid email address" }).max(254)).max(500),
  domains: z.array(z.string().min(1).max(253).regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i, { error: "Invalid domain format" })).max(200),
});
