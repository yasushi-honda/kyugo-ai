import { Router, Request, Response } from "express";
import { firestore, ALLOWED_EMAILS_CONFIG_DOC } from "../config.js";
import { requireAdmin } from "../middleware/authz.js";

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAdmin);

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
    console.error("Failed to get allowed emails config", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin-settings/allowed-emails
adminSettingsRouter.put("/allowed-emails", async (req: Request, res: Response) => {
  const { emails, domains } = req.body;

  if (!Array.isArray(emails) || !Array.isArray(domains)) {
    res.status(400).json({ error: "emails and domains must be arrays of strings" });
    return;
  }

  // 各要素がstringであることを検証
  if (!emails.every((e: unknown) => typeof e === "string") || !domains.every((d: unknown) => typeof d === "string")) {
    res.status(400).json({ error: "emails and domains must be arrays of strings" });
    return;
  }

  // 正規化: 小文字化、空文字除去、重複除去
  const normalizedEmails = [...new Set(emails.map((e: string) => e.trim().toLowerCase()).filter((e: string) => e.length > 0))];
  const normalizedDomains = [...new Set(domains.map((d: string) => d.trim().toLowerCase()).filter((d: string) => d.length > 0))];

  try {
    await firestore.doc(ALLOWED_EMAILS_CONFIG_DOC).set(
      { emails: normalizedEmails, domains: normalizedDomains, updatedAt: new Date() },
      { merge: true },
    );
    res.json({ emails: normalizedEmails, domains: normalizedDomains });
  } catch (err) {
    console.error("Failed to update allowed emails config", (err as Error).message);
    res.status(500).json({ error: "Internal server error" });
  }
});
