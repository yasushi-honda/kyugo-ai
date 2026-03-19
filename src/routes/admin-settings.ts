import { Router, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { firestore, ALLOWED_EMAILS_CONFIG_DOC } from "../config.js";
import { requireAdmin } from "../middleware/authz.js";
import { allowedEmailsSchema } from "../schemas/case.js";

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAdmin);

function toStaffResponse(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    role: (data.role as string) ?? "staff",
    disabled: (data.disabled as boolean) ?? false,
    createdAt: data.createdAt ?? null,
  };
}

// GET /api/admin-settings/staff - 職員一覧（管理用：全フィールド）
adminSettingsRouter.get("/staff", async (_req: Request, res: Response) => {
  try {
    const snapshot = await firestore.collection("staff").get();
    const staff = snapshot.docs.map(toStaffResponse);
    res.json(staff);
  } catch (err) {
    logger.error("Admin staff list failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin-settings/staff/:id - 職員のロール変更・無効化
adminSettingsRouter.patch("/staff/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role, disabled } = req.body;

  // 入力検証
  if (role !== undefined && role !== "admin" && role !== "staff") {
    res.status(400).json({ error: "role must be 'admin' or 'staff'" });
    return;
  }
  if (disabled !== undefined && typeof disabled !== "boolean") {
    res.status(400).json({ error: "disabled must be a boolean" });
    return;
  }
  if (role === undefined && disabled === undefined) {
    res.status(400).json({ error: "At least one of role or disabled is required" });
    return;
  }

  try {
    const staffRef = firestore.collection("staff").doc(id);
    const staffDoc = await staffRef.get();
    if (!staffDoc.exists) {
      res.status(404).json({ error: "Staff not found" });
      return;
    }

    // admin自身のロール降格防止
    if (role === "staff" && id === req.user!.staffId) {
      res.status(400).json({ error: "Cannot demote yourself" });
      return;
    }

    // admin自身の無効化防止
    if (disabled === true && id === req.user!.staffId) {
      res.status(400).json({ error: "Cannot disable yourself" });
      return;
    }

    // 最後のadmin降格防止
    if (role === "staff") {
      const currentData = staffDoc.data()!;
      if (currentData.role === "admin") {
        const adminSnapshot = await firestore.collection("staff")
          .where("role", "==", "admin")
          .where("disabled", "==", false)
          .limit(2)
          .get();
        const activeAdmins = adminSnapshot.docs.filter(
          (d) => d.id !== id,
        );
        if (activeAdmins.length === 0) {
          res.status(400).json({ error: "Cannot demote the last admin" });
          return;
        }
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) updateData.role = role;
    if (disabled !== undefined) updateData.disabled = disabled;

    await staffRef.update(updateData);

    const existingData = staffDoc.data()!;
    const merged = { ...existingData, ...updateData };
    res.json({
      id,
      name: (merged.name as string) ?? "",
      email: (merged.email as string) ?? "",
      role: (merged.role as string) ?? "staff",
      disabled: (merged.disabled as boolean) ?? false,
      createdAt: merged.createdAt ?? null,
    });
  } catch (err) {
    logger.error("Staff update failed", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin-settings/allowed-emails
adminSettingsRouter.get("/allowed-emails", async (_req: Request, res: Response) => {
  try {
    const doc = await firestore.doc(ALLOWED_EMAILS_CONFIG_DOC).get();
    if (!doc.exists) {
      res.json({ emails: [], domains: [] });
      return;
    }
    const data = doc.data()!;
    res.json({
      emails: (data.emails as string[]) ?? [],
      domains: (data.domains as string[]) ?? [],
    });
  } catch (err) {
    logger.error("Failed to get allowed emails config", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin-settings/allowed-emails
adminSettingsRouter.put("/allowed-emails", async (req: Request, res: Response) => {
  const result = allowedEmailsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { emails, domains } = result.data;

  // 正規化: 小文字化、重複除去
  const normalizedEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  const normalizedDomains = [...new Set(domains.map((d) => d.trim().toLowerCase()))];

  try {
    await firestore.doc(ALLOWED_EMAILS_CONFIG_DOC).set(
      { emails: normalizedEmails, domains: normalizedDomains, updatedAt: new Date() },
    );
    res.json({ emails: normalizedEmails, domains: normalizedDomains });
  } catch (err) {
    logger.error("Failed to update allowed emails config", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});
