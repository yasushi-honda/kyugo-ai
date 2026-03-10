import type { ZodType } from "zod";

export function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function validate<T>(schema: ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
}

export function formatDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
