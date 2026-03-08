import { z } from "zod";

// 日付文字列バリデーション（YYYY-MM-DD形式 + 実在する日付）
const dateString = z
  .string({ error: "dateOfBirth must be a string" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD format" })
  .refine((val) => !isNaN(new Date(val).getTime()), { error: "Invalid date" });

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
