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

/**
 * APIモックをセットアップ（バックエンド不要）
 * 注意: Playwrightはルートを逆順（LIFO）で評価するため、
 * catch-allを最初に、具体的なルートを後に登録する
 */
export async function mockApiRoutes(page: Page) {
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
          { staffId: "e2e-staff-001", name: "テスト職員", email: TEST_EMAIL, role: "admin" },
        ]),
      });
    }),

    // GET /api/cases
    page.route("**/api/cases", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "case-001",
            clientName: "テスト太郎",
            status: "active",
            assignedStaffId: "e2e-staff-001",
            assignedStaffName: "テスト職員",
            summary: "テスト相談ケース",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-12T00:00:00.000Z",
          },
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
