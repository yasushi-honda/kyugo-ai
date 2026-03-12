import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

test.describe("ケース詳細・ステータス変更・AI分析表示", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    // ケース詳細画面に遷移
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();
  });

  test("ケース詳細画面にケース情報が表示される", async ({ page }) => {
    // 相談者名
    await expect(page.getByRole("heading", { name: "テスト太郎" })).toBeVisible();
    // ケース情報サイドバー
    await expect(page.getByText("ケース情報")).toBeVisible();
    // C-00123はケースIDとして表示される（サイドバー内で特定）
    await expect(page.locator(".detail-sidebar").getByText("C-00123")).toBeVisible();
    await expect(page.locator(".detail-sidebar").getByText("テスト職員")).toBeVisible();
  });

  test("ステータスを照会中に変更できる", async ({ page }) => {
    const referBtn = page.getByText("照会中に変更");
    await expect(referBtn).toBeVisible();
    await referBtn.click();

    // ステータス変更後にページがリロードされ、新しいステータスが反映
    await expect(page.getByText("対応中に戻す")).toBeVisible({ timeout: 5000 });
  });

  test("相談記録タブに相談が表示される", async ({ page }) => {
    // 相談記録タブボタンがアクティブ
    await expect(page.locator(".detail-tab", { hasText: /相談記録/ })).toBeVisible();
    // モック相談内容が表示される
    await expect(page.getByText("テスト相談内容")).toBeVisible();
    // AI要約が表示される
    await expect(page.getByText("AI要約テスト")).toBeVisible();
    // 支援メニュー提案
    await expect(page.getByText("生活保護")).toBeVisible();
  });

  test("タブ切り替え: 支援計画書タブ", async ({ page }) => {
    await page.getByRole("button", { name: /支援計画書/ }).click();
    // 支援計画書の内容が表示される（overallPolicy）
    await expect(page.getByText(/生活保護の申請支援/)).toBeVisible({ timeout: 5000 });
  });

  test("タブ切り替え: モニタリングタブ", async ({ page }) => {
    await page.getByRole("button", { name: /モニタリング/ }).click();
    // モニタリングシートの内容が表示される（overallEvaluation）
    await expect(page.getByText(/順調に進行中/)).toBeVisible({ timeout: 5000 });
  });

  test("タブ切り替え: 法令検索タブ", async ({ page }) => {
    await page.getByRole("button", { name: /法令検索/ }).click();
    // 法令検索画面が表示される（検索フォームラベル）
    await expect(page.getByText("法令・制度を検索")).toBeVisible({ timeout: 5000 });
  });

  test("AI分析ステータスがcompletedで要約が表示される", async ({ page }) => {
    // AI分析パネルが表示される
    await expect(page.getByText("AIによる要約")).toBeVisible();
    await expect(page.getByText("AI要約テスト")).toBeVisible();
  });
});

test.describe("AI分析ステータス表示（pending/error）", () => {
  test("AI分析中の表示", async ({ page }) => {
    await mockApiRoutes(page);

    // consultationsルートを上書き（LIFOで最後に登録したものが先に評価）
    await page.route(/\/api\/cases\/[^/]+\/consultations$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "cons-pending",
          caseId: "case-001",
          staffId: "e2e-staff-001",
          content: "相談内容",
          transcript: "",
          summary: "",
          suggestedSupports: [],
          consultationType: "counter",
          aiStatus: "pending",
          createdAt: { _seconds: 1709280000 },
          updatedAt: { _seconds: 1709280000 },
        }]),
      });
    });

    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();

    await expect(page.getByText("AI分析中...")).toBeVisible({ timeout: 10000 });
  });

  test("AI分析エラーの表示", async ({ page }) => {
    await mockApiRoutes(page);

    await page.route(/\/api\/cases\/[^/]+\/consultations$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "cons-error",
          caseId: "case-001",
          staffId: "e2e-staff-001",
          content: "相談内容",
          transcript: "",
          summary: "",
          suggestedSupports: [],
          consultationType: "counter",
          aiStatus: "error",
          aiErrorMessage: "AI処理中にエラーが発生しました",
          createdAt: { _seconds: 1709280000 },
          updatedAt: { _seconds: 1709280000 },
        }]),
      });
    });

    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    await page.locator(".case-card").first().click();

    await expect(page.getByText("AI分析エラー")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI処理中にエラーが発生しました")).toBeVisible();
  });
});
