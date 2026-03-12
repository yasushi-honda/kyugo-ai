import { Page } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./global-setup";

interface MockUserInfo {
  staffId: string;
  name: string;
  email: string;
  role: string;
}

const MOCK_USER_INFO: MockUserInfo = {
  staffId: "e2e-staff-001",
  name: "テスト職員",
  email: TEST_EMAIL,
  role: "admin",
};

export const MOCK_CASE = {
  id: "case-001",
  clientName: "テスト太郎",
  clientId: "C-00123",
  status: "active",
  assignedStaffId: "e2e-staff-001",
  assignedStaffName: "テスト職員",
  dateOfBirth: "1990-01-15",
  summary: "テスト相談ケース",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-12T00:00:00.000Z",
};

export const MOCK_CONSULTATION = {
  id: "cons-001",
  caseId: "case-001",
  staffId: "e2e-staff-001",
  content: "テスト相談内容",
  transcript: "",
  summary: "AI要約テスト",
  suggestedSupports: [
    { menuId: "menu-001", menuName: "生活保護", reason: "収入が低い", relevanceScore: 0.9 },
  ],
  consultationType: "counter",
  aiStatus: "completed",
  createdAt: { _seconds: 1709280000 },
  updatedAt: { _seconds: 1709280000 },
};

export const MOCK_SUPPORT_PLAN = {
  id: "plan-001",
  caseId: "case-001",
  staffId: "e2e-staff-001",
  status: "draft",
  clientName: "テスト太郎",
  clientId: "C-00123",
  overallPolicy: "生活保護の申請支援",
  goals: [
    {
      area: "経済的支援",
      longTermGoal: "安定した生活基盤の確保",
      shortTermGoal: "必要書類の収集",
      supports: ["相談支援", "書類作成補助"],
      frequency: "週1回",
      responsible: "テスト職員",
    },
  ],
  specialNotes: "",
  planStartDate: "2026-03-01",
  nextReviewDate: "2026-06-01",
  createdAt: { _seconds: 1709280000 },
  updatedAt: { _seconds: 1709280000 },
};

export const MOCK_MONITORING_SHEET = {
  id: "mon-001",
  caseId: "case-001",
  supportPlanId: "plan-001",
  staffId: "e2e-staff-001",
  status: "draft",
  monitoringDate: "2026-03-10",
  overallEvaluation: "順調に進行中。生活保護申請に向けた準備が進んでいる。",
  goalEvaluations: [
    {
      area: "経済的支援",
      longTermGoal: "安定した生活基盤の確保",
      shortTermGoal: "必要書類の収集",
      progress: "improved",
      evaluation: "書類収集が順調に進んでいる",
      nextAction: "申請書類の最終確認",
    },
  ],
  environmentChanges: "特になし",
  clientFeedback: "前向きに取り組んでいる",
  specialNotes: "",
  nextMonitoringDate: "2026-04-10",
  createdAt: { _seconds: 1709280000 },
  updatedAt: { _seconds: 1709280000 },
};

export const MOCK_LEGAL_SEARCH_RESULT = {
  id: "legal-001",
  caseId: "case-001",
  staffId: "e2e-staff-001",
  query: "生活保護申請の要件",
  legalBasis: "生活保護法第4条に基づき、保護の要件は以下の通りです。",
  references: [
    {
      lawName: "生活保護法",
      article: "第4条",
      summary: "保護の要件について定める",
      sourceUrl: "https://example.com/law",
      relevance: "直接適用",
    },
  ],
  createdAt: { _seconds: 1709280000 },
};

/**
 * APIモックをセットアップ（バックエンド不要）
 * 注意: Playwrightはルートを逆順（LIFO）で評価するため、
 * catch-allを最初に、具体的なルートを後に登録する
 */
export async function mockApiRoutes(page: Page) {
  // 状態管理（ステータス変更等を動的に反映）
  let caseStatus = MOCK_CASE.status;

  await Promise.all([
    // Catch-all（最初に登録 → 最後に評価される）
    page.route("**/api/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }),

    // GET /api/support-menus
    page.route("**/api/support-menus", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "menu-001", name: "生活保護", category: "経済支援", description: "生活保護申請支援" },
        ]),
      });
    }),

    // GET /api/staff
    page.route("**/api/staff", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "e2e-staff-001", name: "テスト職員", email: TEST_EMAIL, role: "admin" },
        ]),
      });
    }),

    // GET/POST /api/cases
    page.route("**/api/cases", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_CASE,
            id: "case-new",
            clientName: "新規テスト",
            clientId: "C-NEW",
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ ...MOCK_CASE, status: caseStatus }]),
        });
      }
    }),

    // GET /api/cases/:id + PATCH /api/cases/:id/status
    page.route(/\/api\/cases\/[^/]+\/status$/, (route) => {
      if (route.request().method() === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          caseStatus = body.status || caseStatus;
        } catch { /* ignore */ }
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_CASE, status: caseStatus }),
        });
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    }),

    // GET /api/cases/:id
    page.route(/\/api\/cases\/[^/]+$/, (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_CASE, status: caseStatus }),
        });
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    }),

    // POST /api/cases/:id/consultations + GET
    page.route(/\/api\/cases\/[^/]+\/consultations$/, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_CONSULTATION),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_CONSULTATION]),
        });
      }
    }),

    // POST /api/cases/:id/consultations/audio
    page.route(/\/api\/cases\/[^/]+\/consultations\/audio$/, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_CONSULTATION,
          id: "cons-audio-001",
          content: "",
          transcript: "音声テキスト",
          summary: "音声AI要約",
          aiStatus: "completed",
        }),
      });
    }),

    // GET /api/cases/:id/consultations/:cId (individual consultation for polling)
    page.route(/\/api\/cases\/[^/]+\/consultations\/[^/]+$/, (route) => {
      if (route.request().url().includes("/audio")) {
        route.fallback();
        return;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_CONSULTATION, aiStatus: "completed" }),
      });
    }),

    // POST /api/cases/:id/support-plan/draft + GET /api/cases/:id/support-plan
    page.route(/\/api\/cases\/[^/]+\/support-plan\/draft$/, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUPPORT_PLAN),
      });
    }),

    // PATCH /api/cases/:id/support-plan/:planId
    page.route(/\/api\/cases\/[^/]+\/support-plan\/[^/]+$/, (route) => {
      if (route.request().method() === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ...MOCK_SUPPORT_PLAN, ...body }),
          });
        } catch {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_SUPPORT_PLAN),
          });
        }
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    }),

    // GET /api/cases/:id/support-plan
    page.route(/\/api\/cases\/[^/]+\/support-plan$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUPPORT_PLAN),
      });
    }),

    // POST /api/cases/:id/monitoring/draft
    page.route(/\/api\/cases\/[^/]+\/monitoring\/draft$/, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_MONITORING_SHEET),
      });
    }),

    // PATCH /api/cases/:id/monitoring/:sheetId
    page.route(/\/api\/cases\/[^/]+\/monitoring\/[^/]+$/, (route) => {
      if (route.request().method() === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ...MOCK_MONITORING_SHEET, ...body }),
          });
        } catch {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_MONITORING_SHEET),
          });
        }
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    }),

    // GET /api/cases/:id/monitoring
    page.route(/\/api\/cases\/[^/]+\/monitoring$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_MONITORING_SHEET),
      });
    }),

    // POST /api/cases/:id/legal-search + GET
    page.route(/\/api\/cases\/[^/]+\/legal-search$/, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LEGAL_SEARCH_RESULT),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_LEGAL_SEARCH_RESULT]),
        });
      }
    }),

    // GET /api/admin-settings/allowed-emails + PUT
    page.route("**/api/admin-settings/allowed-emails", (route) => {
      if (route.request().method() === "PUT") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              emails: body.emails || [],
              domains: body.domains || [],
            }),
          });
        } catch {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ emails: [], domains: [] }),
          });
        }
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ emails: ["test@example.com"], domains: ["example.com"] }),
        });
      }
    }),

    // GET /api/admin-settings/staff + PATCH
    page.route(/\/api\/admin-settings\/staff\/[^/]+$/, (route) => {
      if (route.request().method() === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "e2e-staff-002",
              name: "テスト職員2",
              email: "staff2@example.com",
              role: body.role || "staff",
              disabled: body.disabled ?? false,
            }),
          });
        } catch {
          route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
        }
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    }),

    // GET /api/admin-settings/staff
    page.route("**/api/admin-settings/staff", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "e2e-staff-001", name: "テスト職員", email: TEST_EMAIL, role: "admin", disabled: false },
          { id: "e2e-staff-002", name: "テスト職員2", email: "staff2@example.com", role: "staff", disabled: false },
        ]),
      });
    }),

    // GET /api/me
    page.route("**/api/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER_INFO),
      });
    }),
  ]);
}

/**
 * Firebase Auth Emulatorで認証（signInWithEmailAndPassword）
 * ページが完全にロードされ、__e2eSignInが利用可能になるまで待機
 */
export async function signInTestUser(page: Page) {
  await page.waitForFunction(
    () => typeof (window as unknown as Record<string, unknown>).__e2eSignIn === "function",
    { timeout: 15000 },
  );

  await page.evaluate(
    async ([email, password]) => {
      const signIn = (window as unknown as Record<string, unknown>).__e2eSignIn as
        (email: string, password: string) => Promise<unknown>;
      await signIn(email, password);
    },
    [TEST_EMAIL, TEST_PASSWORD] as const,
  );
}
