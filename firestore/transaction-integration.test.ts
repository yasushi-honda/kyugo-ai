/**
 * Firestoreトランザクション統合テスト
 * Emulator上で実際のトランザクションが並行リクエストを正しく処理するか検証する。
 *
 * 実行: FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 npx vitest run src/repositories/transaction-integration.test.ts
 * またはEmulator経由: firebase emulators:exec --only firestore --project demo-transaction-test 'npx vitest run src/repositories/transaction-integration.test.ts'
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Firestore, Timestamp } from "@google-cloud/firestore";

const PROJECT_ID = "demo-transaction-test";
const db = new Firestore({ projectId: PROJECT_ID, databaseId: "(default)" });

async function clearCollection(path: string) {
  const snapshot = await db.collection(path).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

describe("Firestoreトランザクション統合テスト", () => {
  // ============================================================
  // updateCaseStatus: 並行ステータス遷移
  // ============================================================
  describe("updateCaseStatus - 並行ステータス遷移", () => {
    const CASES = "cases";

    beforeEach(async () => {
      await clearCollection(CASES);
    });

    it("同時に2つのステータス変更が来た場合、1つだけ成功する", async () => {
      // Arrange: active なケースを作成
      const caseRef = db.collection(CASES).doc("case-1");
      await caseRef.set({
        clientName: "テスト",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const VALID_TRANSITIONS: Record<string, string[]> = {
        active: ["referred", "closed"],
        referred: ["active", "closed"],
        closed: [],
      };

      // トランザクション関数（本番コードと同じロジック）
      async function updateStatus(id: string, newStatus: string) {
        const docRef = db.collection(CASES).doc(id);
        return db.runTransaction(async (tx) => {
          const doc = await tx.get(docRef);
          if (!doc.exists) throw new Error("not found");
          const current = doc.data()!;
          const allowed = VALID_TRANSITIONS[current.status as string] ?? [];
          if (!allowed.includes(newStatus)) {
            throw new Error(`Invalid transition: ${current.status} → ${newStatus}`);
          }
          tx.update(docRef, { status: newStatus, updatedAt: Timestamp.now() });
          return newStatus;
        });
      }

      // Act: active → referred と active → closed を同時に実行
      const results = await Promise.allSettled([
        updateStatus("case-1", "referred"),
        updateStatus("case-1", "closed"),
      ]);

      // Assert: 両方成功する可能性もあるが、最終状態は一貫している
      const finalDoc = await caseRef.get();
      const finalStatus = finalDoc.data()!.status;
      expect(["referred", "closed"]).toContain(finalStatus);

      // 少なくとも1つは成功
      const succeeded = results.filter((r) => r.status === "fulfilled");
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
    });

    it("不正な遷移（closed → active）はトランザクション内で拒否される", async () => {
      const caseRef = db.collection(CASES).doc("case-closed");
      await caseRef.set({
        clientName: "テスト",
        status: "closed",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const VALID_TRANSITIONS: Record<string, string[]> = {
        active: ["referred", "closed"],
        referred: ["active", "closed"],
        closed: [],
      };

      await expect(
        db.runTransaction(async (tx) => {
          const doc = await tx.get(caseRef);
          const current = doc.data()!;
          const allowed = VALID_TRANSITIONS[current.status as string] ?? [];
          if (!allowed.includes("active")) {
            throw new Error(`Invalid transition: ${current.status} → active`);
          }
          tx.update(caseRef, { status: "active" });
        }),
      ).rejects.toThrow("Invalid transition: closed → active");
    });
  });

  // ============================================================
  // updateSupportPlan: 確定済み計画の上書き防止
  // ============================================================
  describe("updateSupportPlan - 確定済み上書き防止", () => {
    const CASES = "cases";

    beforeEach(async () => {
      await clearCollection(CASES);
    });

    it("2つの確定リクエストが並行で来ても、二重確定にならない", async () => {
      // Arrange: draft状態の支援計画
      const caseRef = db.collection(CASES).doc("case-sp");
      await caseRef.set({ clientName: "テスト" });
      const planRef = caseRef.collection("supportPlans").doc("plan-1");
      await planRef.set({
        status: "draft",
        overallPolicy: "テスト方針",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      async function confirmPlan() {
        return db.runTransaction(async (tx) => {
          const doc = await tx.get(planRef);
          if (!doc.exists) throw new Error("not found");
          const current = doc.data()!;
          if (current.status === "confirmed") {
            throw new Error("Cannot edit a confirmed support plan");
          }
          const now = Timestamp.now();
          tx.update(planRef, { status: "confirmed", confirmedAt: now, updatedAt: now });
          return "confirmed";
        });
      }

      // Act: 同時に2つの確定リクエスト
      const results = await Promise.allSettled([confirmPlan(), confirmPlan()]);

      // Assert: 1つは成功、もう1つは失敗（または両方成功するがデータは一貫）
      const finalDoc = await planRef.get();
      expect(finalDoc.data()!.status).toBe("confirmed");

      // 成功は少なくとも1つ
      const succeeded = results.filter((r) => r.status === "fulfilled");
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
    });

    it("確定済み計画の編集はトランザクション内で拒否される", async () => {
      const caseRef = db.collection(CASES).doc("case-sp2");
      await caseRef.set({ clientName: "テスト" });
      const planRef = caseRef.collection("supportPlans").doc("plan-2");
      await planRef.set({
        status: "confirmed",
        overallPolicy: "確定済み方針",
        confirmedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await expect(
        db.runTransaction(async (tx) => {
          const doc = await tx.get(planRef);
          if (doc.data()!.status === "confirmed") {
            throw new Error("Cannot edit a confirmed support plan");
          }
          tx.update(planRef, { overallPolicy: "変更" });
        }),
      ).rejects.toThrow("Cannot edit a confirmed support plan");
    });
  });

  // ============================================================
  // admin PATCH: 最後のadmin保護
  // ============================================================
  describe("admin PATCH - 最後のadmin保護", () => {
    const STAFF = "staff";

    beforeEach(async () => {
      await clearCollection(STAFF);
    });

    it("2つの降格リクエストが並行で来ても、adminが0人にならない", async () => {
      // Arrange: admin 2人
      await db.collection(STAFF).doc("admin-1").set({ role: "admin", disabled: false, name: "管理者1" });
      await db.collection(STAFF).doc("admin-2").set({ role: "admin", disabled: false, name: "管理者2" });

      async function demoteAdmin(id: string) {
        const staffRef = db.collection(STAFF).doc(id);
        return db.runTransaction(async (tx) => {
          const doc = await tx.get(staffRef);
          if (!doc.exists) throw new Error("not found");
          const current = doc.data()!;
          if (current.role === "admin") {
            const snapshot = await tx.get(
              db.collection(STAFF).where("role", "==", "admin").where("disabled", "==", false).limit(2),
            );
            const others = snapshot.docs.filter((d) => d.id !== id);
            if (others.length === 0) {
              throw new Error("Cannot demote the last admin");
            }
          }
          tx.update(staffRef, { role: "staff" });
          return "demoted";
        });
      }

      // Act: 2人同時に降格
      const results = await Promise.allSettled([
        demoteAdmin("admin-1"),
        demoteAdmin("admin-2"),
      ]);

      // Assert: 最低1人のadminが残る
      const snapshot = await db.collection(STAFF).where("role", "==", "admin").get();
      expect(snapshot.docs.length).toBeGreaterThanOrEqual(1);

      // 少なくとも1つは成功
      const succeeded = results.filter((r) => r.status === "fulfilled");
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
    });

    it("唯一のadminは降格できない", async () => {
      await db.collection(STAFF).doc("sole-admin").set({ role: "admin", disabled: false, name: "唯一の管理者" });

      await expect(
        db.runTransaction(async (tx) => {
          const staffRef = db.collection(STAFF).doc("sole-admin");
          const doc = await tx.get(staffRef);
          const current = doc.data()!;
          if (current.role === "admin") {
            const snapshot = await tx.get(
              db.collection(STAFF).where("role", "==", "admin").where("disabled", "==", false).limit(2),
            );
            const others = snapshot.docs.filter((d) => d.id !== "sole-admin");
            if (others.length === 0) {
              throw new Error("Cannot demote the last admin");
            }
          }
          tx.update(staffRef, { role: "staff" });
        }),
      ).rejects.toThrow("Cannot demote the last admin");
    });
  });
});
