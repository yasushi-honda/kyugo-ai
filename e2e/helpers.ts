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

// --- ヘルプスクリーンショット用デモデータ ---

export const DEMO_STAFF_EMAIL = "sato@city.ibaraki.example.jp";

const DEMO_USER_INFO: MockUserInfo = {
  staffId: "staff-demo-001",
  name: "佐藤 太郎（サトウ）",
  email: DEMO_STAFF_EMAIL,
  role: "admin",
};

const DEMO_CASE = {
  id: "case-demo-001",
  clientName: "山田 花子",
  clientId: "client-2024-001",
  status: "active",
  assignedStaffId: "staff-demo-001",
  assignedStaffName: "佐藤 太郎（サトウ）",
  dateOfBirth: { _seconds: -361238400 }, // 1958-07-22
  summary: "一人暮らしの高齢者。年金収入のみで生活が困窮。",
  createdAt: { _seconds: 1771146000 }, // 2026-02-15
  updatedAt: { _seconds: 1773153000 }, // 2026-03-10
};

const DEMO_CONSULTATION = {
  id: "cons-demo-001",
  caseId: "case-demo-001",
  staffId: "staff-demo-001",
  content:
    "訪問相談。山田さん（67歳）は月8万円の年金で一人暮らし。最近、医療費の自己負担が重く、通院が困難になっている。食費も切り詰めており、栄養状態が心配。近隣に頼れる親族はいない。",
  transcript: "",
  summary:
    "一人暮らしの高齢者が月8万円の年金で生活しており、医療費の自己負担が重く、通院が困難になっている状態。経済的な困窮と医療アクセスへの課題を抱えている。",
  suggestedSupports: [
    {
      menuId: "menu-001",
      menuName: "生活保護",
      reason:
        "年金収入が生活保護基準を下回っており、医療扶助により医療費の自己負担がなくなります。",
      relevanceScore: 0.95,
    },
    {
      menuId: "menu-002",
      menuName: "生活困窮者自立支援制度",
      reason:
        "生活保護に至る前の段階で、家計改善や就労支援等の包括的な支援を受けられます。",
      relevanceScore: 0.88,
    },
    {
      menuId: "menu-003",
      menuName: "高額療養費制度",
      reason:
        "医療費の自己負担が高額になった場合、限度額を超えた分が払い戻されます。",
      relevanceScore: 0.72,
    },
  ],
  consultationType: "visit",
  aiStatus: "completed",
  createdAt: { _seconds: 1773158400 }, // 2026-03-10 16:00
  updatedAt: { _seconds: 1773158400 },
};

// --- ヘルプ用デモデータ: 支援計画書 ---
const DEMO_SUPPORT_PLAN = {
  id: "plan-demo-001",
  caseId: "case-demo-001",
  staffId: "staff-demo-001",
  status: "draft",
  clientName: "山田 花子",
  clientId: "client-2024-001",
  overallPolicy:
    "生活保護申請と医療費支援を軸に、安定した生活基盤の確保を目指す。年金収入の範囲で生活が成り立つよう家計管理の支援も並行して行う。",
  goals: [
    {
      area: "経済的支援",
      longTermGoal: "生活保護受給による安定した生活基盤の確保",
      shortTermGoal: "生活保護申請に必要な書類の収集・提出",
      supports: ["生活保護申請支援", "家計改善支援", "住居確保給付金の検討"],
      frequency: "週1回",
      responsible: "佐藤 太郎（サトウ）",
    },
    {
      area: "医療支援",
      longTermGoal: "定期的な通院による健康状態の維持・改善",
      shortTermGoal: "医療扶助の申請と通院再開",
      supports: ["医療扶助申請", "通院同行支援", "高額療養費制度の利用案内"],
      frequency: "月2回",
      responsible: "佐藤 太郎（サトウ）",
    },
  ],
  specialNotes: "",
  planStartDate: "2026-03-01",
  nextReviewDate: "2026-06-01",
  createdAt: { _seconds: 1772542800 },
  updatedAt: { _seconds: 1773153000 },
};

// --- ヘルプ用デモデータ: モニタリングシート ---
const DEMO_MONITORING_SHEET = {
  id: "mon-demo-001",
  caseId: "case-demo-001",
  supportPlanId: "plan-demo-001",
  staffId: "staff-demo-001",
  status: "draft",
  monitoringDate: "2026-03-15",
  overallEvaluation:
    "生活保護申請に向けた準備が順調に進んでいる。必要書類の大半を収集済みで、来週中に申請予定。医療面では、近隣クリニックへの通院を再開し、高血圧の治療を開始した。",
  goalEvaluations: [
    {
      area: "経済的支援",
      longTermGoal: "生活保護受給による安定した生活基盤の確保",
      shortTermGoal: "生活保護申請に必要な書類の収集・提出",
      progress: "improved",
      evaluation: "収入証明・住民票等の必要書類を8割収集済み。申請書の下書きも完了。",
      nextAction: "残りの書類（年金振込通知書）を取得し、来週中に福祉事務所へ申請",
    },
    {
      area: "医療支援",
      longTermGoal: "定期的な通院による健康状態の維持・改善",
      shortTermGoal: "医療扶助の申請と通院再開",
      progress: "maintained",
      evaluation: "近隣クリニックへの通院を再開。高額療養費制度の利用申請を提出済み。",
      nextAction: "生活保護受給決定後、医療扶助への切り替え手続きを進める",
    },
  ],
  environmentChanges: "特になし。引き続き一人暮らし。",
  clientFeedback: "「書類を集めるのは大変だったけど、職員さんが一緒に確認してくれて心強い」とのこと。",
  specialNotes: "",
  nextMonitoringDate: "2026-04-15",
  createdAt: { _seconds: 1773753600 },
  updatedAt: { _seconds: 1773753600 },
};

// --- ヘルプ用デモデータ: 法令検索結果 ---
const DEMO_LEGAL_SEARCH_RESULT = {
  id: "legal-demo-001",
  caseId: "case-demo-001",
  staffId: "staff-demo-001",
  query: "高齢者の生活保護申請要件",
  legalBasis:
    "生活保護法第4条に基づき、利用し得る資産、能力その他あらゆるものを活用しても最低限度の生活を維持できない場合に保護を受けることができます。年金受給者であっても、年金額が最低生活費を下回る場合は差額分の保護を受けられます。",
  references: [
    {
      lawName: "生活保護法",
      article: "第4条（保護の補足性）",
      summary:
        "保護は、生活に困窮する者が、その利用し得る資産、能力その他あらゆるものを、その最低限度の生活の維持のために活用することを要件として行われる。",
      sourceUrl: "https://example.com/law/seikatsu-hogo",
      relevance: "直接適用",
    },
    {
      lawName: "生活保護法",
      article: "第15条（医療扶助）",
      summary:
        "医療扶助は、困窮のため最低限度の生活を維持することのできない者に対して、診察、薬剤又は治療材料等を給付する。",
      sourceUrl: "https://example.com/law/iryou-fujo",
      relevance: "関連規定",
    },
  ],
  createdAt: { _seconds: 1773158400 },
};

// --- ヘルプ用デモデータ: 管理者設定 ---
const DEMO_ADMIN_STAFF = [
  {
    id: "staff-demo-001",
    name: "佐藤 太郎（サトウ）",
    email: DEMO_STAFF_EMAIL,
    role: "admin",
    disabled: false,
    createdAt: { _seconds: 1771146000 },
  },
  {
    id: "staff-demo-002",
    name: "鈴木 次郎（スズキ）",
    email: "suzuki@city.ibaraki.example.jp",
    role: "staff",
    disabled: false,
    createdAt: { _seconds: 1771232400 },
  },
  {
    id: "staff-demo-003",
    name: "田中 三郎（タナカ）",
    email: "tanaka@city.ibaraki.example.jp",
    role: "staff",
    disabled: false,
    createdAt: { _seconds: 1771318800 },
  },
];

const DEMO_ALLOWED_EMAILS = {
  emails: [
    "yamamoto@city.mito.example.jp",
    "watanabe@city.hitachi.example.jp",
  ],
  domains: ["city.ibaraki.example.jp"],
};

/**
 * ヘルプスクリーンショット用デモデータでAPIモックをセットアップ
 */
export async function mockApiRoutesForHelp(page: Page) {
  // Playwrightはルートを逆順（LIFO）で評価するため、
  // catch-all（**/api/**）を最初に、具体的なルートを後に登録する
  await Promise.all([
    page.route("**/api/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }),

    page.route("**/api/support-menus", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "menu-001", name: "生活保護", category: "経済支援", description: "最低限度の生活を保障し自立を助長する制度" },
          { id: "menu-002", name: "生活困窮者自立支援制度", category: "総合支援", description: "生活困窮者への包括的支援" },
          { id: "menu-003", name: "高額療養費制度", category: "医療支援", description: "医療費の自己負担限度額制度" },
        ]),
      });
    }),

    page.route("**/api/staff", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "staff-demo-001", name: "佐藤 太郎（サトウ）", email: DEMO_STAFF_EMAIL, role: "admin" },
        ]),
      });
    }),

    page.route("**/api/cases", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(DEMO_CASE),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([DEMO_CASE]),
        });
      }
    }),

    page.route(/\/api\/cases\/[^/]+\/status$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_CASE),
      });
    }),

    page.route(/\/api\/cases\/[^/]+$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_CASE),
      });
    }),

    page.route(/\/api\/cases\/[^/]+\/consultations$/, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(DEMO_CONSULTATION),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            DEMO_CONSULTATION,
            {
              ...DEMO_CONSULTATION,
              id: "cons-demo-002",
              content: "電話相談。山田さんより生活保護申請書類の進捗について連絡あり。年金振込通知書の取得方法について相談。",
              summary: "生活保護申請書類の進捗確認。年金振込通知書の取得方法についての電話相談。",
              consultationType: "phone",
              editedAt: { _seconds: 1773244800 },
              editedBy: "staff-demo-001",
              createdAt: { _seconds: 1773072000 },
              updatedAt: { _seconds: 1773244800 },
            },
          ]),
        });
      }
    }),

    page.route(/\/api\/cases\/[^/]+\/consultations\/audio$/, (route) => {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...DEMO_CONSULTATION,
          id: "cons-demo-audio",
          content: "",
          transcript: "音声テキスト変換結果",
          aiStatus: "completed",
        }),
      });
    }),

    page.route(/\/api\/cases\/[^/]+\/consultations\/[^/]+$/, (route) => {
      if (route.request().url().includes("/audio")) {
        route.fallback();
        return;
      }
      const method = route.request().method();
      if (method === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...DEMO_CONSULTATION,
              ...body,
              aiStatus: "pending",
              editedAt: { _seconds: Math.floor(Date.now() / 1000) },
              editedBy: "staff-demo-001",
            }),
          });
        } catch {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(DEMO_CONSULTATION),
          });
        }
      } else if (method === "DELETE") {
        route.fulfill({ status: 204, body: "" });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...DEMO_CONSULTATION, aiStatus: "completed" }),
        });
      }
    }),

    // 支援計画書
    page.route(/\/api\/cases\/[^/]+\/support-plan$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_SUPPORT_PLAN),
      });
    }),

    // モニタリングシート
    page.route(/\/api\/cases\/[^/]+\/monitoring$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_MONITORING_SHEET),
      });
    }),

    // 法令検索（過去結果一覧）
    page.route(/\/api\/cases\/[^/]+\/legal-search$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([DEMO_LEGAL_SEARCH_RESULT]),
      });
    }),

    // 管理者設定: 許可メール・ドメイン
    page.route("**/api/admin-settings/allowed-emails", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_ALLOWED_EMAILS),
      });
    }),

    // 管理者設定: 職員一覧
    page.route("**/api/admin-settings/staff", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_ADMIN_STAFF),
      });
    }),

    page.route("**/api/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DEMO_USER_INFO),
      });
    }),
  ]);
}

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

    // GET/PATCH/DELETE /api/cases/:id/consultations/:cId
    page.route(/\/api\/cases\/[^/]+\/consultations\/[^/]+$/, (route) => {
      if (route.request().url().includes("/audio")) {
        route.fallback();
        return;
      }
      const method = route.request().method();
      if (method === "PATCH") {
        try {
          const body = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...MOCK_CONSULTATION,
              ...body,
              aiStatus: "pending",
              editedAt: { _seconds: Math.floor(Date.now() / 1000) },
              editedBy: "e2e-staff-001",
            }),
          });
        } catch {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_CONSULTATION),
          });
        }
      } else if (method === "DELETE") {
        route.fulfill({ status: 204, body: "" });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_CONSULTATION, aiStatus: "completed" }),
        });
      }
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
