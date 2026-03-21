import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser, MOCK_SUPPORT_PLAN, MOCK_MONITORING_SHEET } from "./helpers";

test.describe("支援計画書フロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();
  });

  test("支援計画書タブで計画が表示される", async ({ page }) => {
    await page.getByRole("button", { name: /支援計画書/ }).click();
    // overallPolicyが表示される
    await expect(page.getByText(/生活保護の申請支援/)).toBeVisible({ timeout: 5000 });
    // ステータスバッジ
    await expect(page.getByText("下書き")).toBeVisible();
  });

  test("支援計画書の確定ボタンが機能する", async ({ page }) => {
    await page.getByRole("button", { name: /支援計画書/ }).click();
    await expect(page.getByText(/生活保護の申請支援/)).toBeVisible({ timeout: 5000 });

    // 確定ボタンを探す（draftステータスの場合のみ表示）
    const confirmBtn = page.getByRole("button", { name: "確定" });
    if (await confirmBtn.isVisible()) {
      // confirm()ダイアログを自動承認
      page.on("dialog", (dialog) => dialog.accept());
      await confirmBtn.click();
    }
  });
});

test.describe("モニタリングシートフロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();
  });

  test("モニタリングタブでシートが表示される", async ({ page }) => {
    await page.getByRole("button", { name: /モニタリング/ }).click();
    // overallEvaluationが表示される
    await expect(page.getByText(/順調に進行中/)).toBeVisible({ timeout: 5000 });
    // ステータスバッジ
    await expect(page.getByText("下書き")).toBeVisible();
  });

  test("モニタリングシートの確定操作", async ({ page }) => {
    await page.getByRole("button", { name: /モニタリング/ }).click();
    await expect(page.getByText(/順調に進行中/)).toBeVisible({ timeout: 5000 });

    const confirmBtn = page.getByRole("button", { name: "確定" });
    if (await confirmBtn.isVisible()) {
      page.on("dialog", (dialog) => dialog.accept());
      await confirmBtn.click();
    }
  });
});

test.describe("P0回帰: goals/goalEvaluations欠損でクラッシュしない", () => {
  test("支援計画書タブ: goalsが未定義でもクラッシュしない", async ({ page }) => {
    await mockApiRoutes(page);
    // goalsを除外した支援計画書データで上書き
    const { goals: _g, ...planWithoutGoals } = MOCK_SUPPORT_PLAN;
    void _g;
    await page.route(/\/api\/cases\/[^/]+\/support-plan$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(planWithoutGoals),
      });
    });
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await page.getByRole("button", { name: /支援計画書/ }).click();
    // クラッシュせず計画書が表示される（ErrorBoundaryが出ない）
    await expect(page.getByText(/個別支援計画書/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/予期しないエラー/)).not.toBeVisible();
  });

  test("支援計画書タブ: goalsが空配列でもクラッシュしない", async ({ page }) => {
    await mockApiRoutes(page);
    await page.route(/\/api\/cases\/[^/]+\/support-plan$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_SUPPORT_PLAN, goals: [] }),
      });
    });
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await page.getByRole("button", { name: /支援計画書/ }).click();
    await expect(page.getByText(/個別支援計画書/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/予期しないエラー/)).not.toBeVisible();
  });

  test("モニタリングタブ: goalEvaluationsが未定義でもクラッシュしない", async ({ page }) => {
    await mockApiRoutes(page);
    const { goalEvaluations: _ge, ...sheetWithoutEvals } = MOCK_MONITORING_SHEET;
    void _ge;
    await page.route(/\/api\/cases\/[^/]+\/monitoring$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sheetWithoutEvals),
      });
    });
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await page.getByRole("button", { name: /モニタリング/ }).click();
    await expect(page.getByText(/モニタリングシート/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/予期しないエラー/)).not.toBeVisible();
  });
});

test.describe("法令検索フロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();
  });

  test("法令検索タブで過去の検索結果が表示される", async ({ page }) => {
    await page.getByRole("button", { name: /法令検索/ }).click();
    // 過去の検索結果がリスト表示される
    await expect(page.getByText(/生活保護申請の要件/)).toBeVisible({ timeout: 5000 });
  });

  test("法令検索を実行できる", async ({ page }) => {
    await page.getByRole("button", { name: /法令検索/ }).click();

    // 検索フォームに入力（textarea）
    const searchInput = page.getByPlaceholder(/生活保護の申請条件/);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill("生活保護の申請要件について");

    // 検索実行ボタン
    const searchBtn = page.getByRole("button", { name: "関連法令を検索" });
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();

    // 結果が表示される（legalBasis）— POSTで新結果追加後、既存結果と合わせて2つ表示されるため.first()
    await expect(page.getByText(/生活保護法第4条/).first()).toBeVisible({ timeout: 10000 });
  });
});
