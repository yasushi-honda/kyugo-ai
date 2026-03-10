import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

const PROJECT_ID = "demo-firestore-rules-test";
const RULES_PATH = path.join(__dirname, "firestore.rules");

let testEnv: RulesTestEnvironment;

// テストユーザー
const STAFF_UID = "staff-001";
const OTHER_STAFF_UID = "staff-002";
const ADMIN_UID = "admin-001";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, "utf8"),
      host: "127.0.0.1",
      port: 8181,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ヘルパー: テストデータをセットアップ（ルールをバイパス）
async function setupCaseData(caseId: string, assignedStaffId: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "cases", caseId), {
      clientName: "テスト太郎",
      clientId: "client-001",
      status: "active",
      assignedStaffId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function setupConsultationData(caseId: string, consultationId: string, assignedStaffId: string) {
  await setupCaseData(caseId, assignedStaffId);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "cases", caseId, "consultations", consultationId), {
      staffId: assignedStaffId,
      content: "相談内容",
      consultationType: "visit",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function setupStaffData(staffId: string, role: string = "staff") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "staff", staffId), {
      name: "テスト職員",
      email: "test@example.com",
      role,
      firebaseUid: staffId,
      createdAt: new Date(),
    });
  });
}

function staffContext(uid: string) {
  return testEnv.authenticatedContext(uid);
}

function adminContext() {
  return testEnv.authenticatedContext(ADMIN_UID, { admin: true });
}

function unauthContext() {
  return testEnv.unauthenticatedContext();
}

// ============================================================
// cases コレクション
// ============================================================
describe("cases", () => {
  it("未認証ユーザーはケースを読み取れない", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, "cases", "case-1")));
  });

  it("担当職員は自分のケースを読み取れる", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "cases", "case-1")));
  });

  it("非担当職員は他人のケースを読み取れない", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(getDoc(doc(db, "cases", "case-1")));
  });

  it("adminは任意のケースを読み取れる", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = adminContext().firestore();
    await assertSucceeds(getDoc(doc(db, "cases", "case-1")));
  });

  it("認証済みユーザーはケースを作成できる", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(addDoc(collection(db, "cases"), {
      clientName: "新規太郎",
      clientId: "client-new",
      status: "active",
      assignedStaffId: STAFF_UID,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it("担当職員はケースを更新できる", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, "cases", "case-1"), { status: "closed" }));
  });

  it("非担当職員はケースを更新できない", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(updateDoc(doc(db, "cases", "case-1"), { status: "closed" }));
  });

  it("担当者はassignedStaffIdを変更できる（Express層で制御、ルール層では許可）", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, "cases", "case-1"), { assignedStaffId: OTHER_STAFF_UID }));
  });

  it("adminでもケースを削除できない", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = adminContext().firestore();
    await assertFails(deleteDoc(doc(db, "cases", "case-1")));
  });

  it("ケースの削除は禁止", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(deleteDoc(doc(db, "cases", "case-1")));
  });
});

// ============================================================
// consultations サブコレクション
// ============================================================
describe("consultations", () => {
  it("未認証ユーザーは相談記録を読み取れない", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, "cases", "case-1", "consultations", "cons-1")));
  });

  it("親ケース担当者は相談記録を読み取れる", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "cases", "case-1", "consultations", "cons-1")));
  });

  it("非担当者は相談記録を読み取れない", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(getDoc(doc(db, "cases", "case-1", "consultations", "cons-1")));
  });

  it("親ケース担当者は相談記録を作成できる", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(addDoc(collection(db, "cases", "case-1", "consultations"), {
      staffId: STAFF_UID,
      content: "新規相談",
      consultationType: "visit",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it("非担当者は相談記録を作成できない", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(addDoc(collection(db, "cases", "case-1", "consultations"), {
      staffId: OTHER_STAFF_UID,
      content: "不正な相談",
      consultationType: "visit",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it("adminは相談記録を作成できる", async () => {
    await setupCaseData("case-1", STAFF_UID);
    const db = adminContext().firestore();
    await assertSucceeds(addDoc(collection(db, "cases", "case-1", "consultations"), {
      staffId: ADMIN_UID,
      content: "管理者相談",
      consultationType: "phone",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it("非担当者は相談記録を更新できない", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(updateDoc(doc(db, "cases", "case-1", "consultations", "cons-1"), { content: "不正更新" }));
  });

  it("adminは相談記録を更新できる", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = adminContext().firestore();
    await assertSucceeds(updateDoc(doc(db, "cases", "case-1", "consultations", "cons-1"), { content: "管理者更新" }));
  });

  it("相談記録の削除は禁止", async () => {
    await setupConsultationData("case-1", "cons-1", STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(deleteDoc(doc(db, "cases", "case-1", "consultations", "cons-1")));
  });
});

// ============================================================
// staff コレクション
// ============================================================
describe("staff", () => {
  it("未認証ユーザーはstaffを読み取れない", async () => {
    await setupStaffData(STAFF_UID);
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, "staff", STAFF_UID)));
  });

  it("認証済みユーザーは任意のstaffを読み取れる", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "staff", STAFF_UID)));
  });

  it("自分のstaffドキュメントを作成できる", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(setDoc(doc(db, "staff", STAFF_UID), {
      name: "新規職員",
      email: "new@example.com",
      role: "staff",
      firebaseUid: STAFF_UID,
      createdAt: new Date(),
    }));
  });

  it("staff作成時にrole:'admin'を指定すると拒否される（権限昇格防止）", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(setDoc(doc(db, "staff", STAFF_UID), {
      name: "昇格試行",
      email: "escalate@example.com",
      role: "admin",
      firebaseUid: STAFF_UID,
      createdAt: new Date(),
    }));
  });

  it("staff作成時にroleフィールドが未指定だと拒否される", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(setDoc(doc(db, "staff", STAFF_UID), {
      name: "roleなし職員",
      email: "norole@example.com",
      firebaseUid: STAFF_UID,
      createdAt: new Date(),
    }));
  });

  it("他人のstaffドキュメントは作成できない", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(setDoc(doc(db, "staff", OTHER_STAFF_UID), {
      name: "偽装職員",
      email: "fake@example.com",
      role: "staff",
      firebaseUid: OTHER_STAFF_UID,
      createdAt: new Date(),
    }));
  });

  it("自分のstaffドキュメントをrole以外で更新できる", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, "staff", STAFF_UID), { name: "更新後の名前" }));
  });

  it("非adminは自分のroleフィールドを変更できない（権限昇格防止）", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(updateDoc(doc(db, "staff", STAFF_UID), { role: "admin" }));
  });

  it("非adminがroleと他フィールドを同時更新しても拒否される", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(updateDoc(doc(db, "staff", STAFF_UID), { name: "更新", role: "admin" }));
  });

  it("adminは他人のroleフィールドを変更できる", async () => {
    await setupStaffData(STAFF_UID);
    const db = adminContext().firestore();
    await assertSucceeds(updateDoc(doc(db, "staff", STAFF_UID), { role: "admin" }));
  });

  it("他人のstaffドキュメントは更新できない", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(OTHER_STAFF_UID).firestore();
    await assertFails(updateDoc(doc(db, "staff", STAFF_UID), { name: "不正更新" }));
  });

  it("staffドキュメントの削除は禁止", async () => {
    await setupStaffData(STAFF_UID);
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(deleteDoc(doc(db, "staff", STAFF_UID)));
  });
});

// ============================================================
// supportMenus コレクション
// ============================================================
describe("supportMenus", () => {
  it("未認証ユーザーはsupportMenusを読み取れない", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "supportMenus", "menu-1"), { name: "生活保護", category: "income" });
    });
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, "supportMenus", "menu-1")));
  });

  it("認証済みユーザーはsupportMenusを読み取れる", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "supportMenus", "menu-1"), { name: "生活保護", category: "income" });
    });
    const db = staffContext(STAFF_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "supportMenus", "menu-1")));
  });

  it("supportMenusへの書き込みは禁止", async () => {
    const db = adminContext().firestore();
    await assertFails(setDoc(doc(db, "supportMenus", "menu-new"), { name: "不正メニュー" }));
  });
});

// ============================================================
// config コレクション（Admin SDKのみ）
// ============================================================
describe("config", () => {
  it("未認証ユーザーはconfigを読み取れない", async () => {
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, "config", "allowedEmails")));
  });

  it("認証済みユーザーでもconfigを読み取れない", async () => {
    const db = staffContext(STAFF_UID).firestore();
    await assertFails(getDoc(doc(db, "config", "allowedEmails")));
  });

  it("adminでもconfigを読み取れない（Admin SDKのみ）", async () => {
    const db = adminContext().firestore();
    await assertFails(getDoc(doc(db, "config", "allowedEmails")));
  });

  it("adminでもconfigに書き込めない（Admin SDKのみ）", async () => {
    const db = adminContext().firestore();
    await assertFails(setDoc(doc(db, "config", "allowedEmails"), { emails: [], domains: [] }));
  });
});

// ============================================================
// デフォルトルール（未知のコレクション）
// ============================================================
describe("default deny", () => {
  it("未知のコレクションへのアクセスは全て拒否", async () => {
    const db = adminContext().firestore();
    await assertFails(getDoc(doc(db, "unknownCollection", "doc-1")));
  });
});
