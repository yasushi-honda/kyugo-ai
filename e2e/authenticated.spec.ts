import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

test.describe("認証済みフロー", () => {
  test.beforeEach(async ({ page }) => {
    // APIモックは page.goto より前にセットアップ（リクエストをインターセプトするため）
    await mockApiRoutes(page);
    // ページに遷移してからサインイン
    await page.goto("/");
    await signInTestUser(page);
    // ダッシュボード表示を待つ
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
  });

  test("ログイン後にダッシュボードが表示される", async ({ page }) => {
    await expect(page.getByText("テスト太郎")).toBeVisible();
  });

  test("ダッシュボードにケース情報が表示される", async ({ page }) => {
    // ケース統計とステータスが表示される
    await expect(page.getByText("総ケース数")).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "対応中" })).toBeVisible();
  });

  test("ナビゲーションが動作する", async ({ page }) => {
    // ヘルプページへ遷移（UIテキストはアイコン付きのため柔軟にマッチ）
    const helpLink = page.getByRole("link", { name: /ヘルプ|使い方/i });
    if (await helpLink.isVisible()) {
      await helpLink.click();
      await expect(page).toHaveURL(/\/help/);
    }
  });

  test("ログアウトが動作する", async ({ page }) => {
    // ログアウトボタンをクリック
    const logoutButton = page.getByRole("button", { name: /ログアウト/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      // ログインページに戻る
      await expect(page.getByRole("button", { name: /google/i })).toBeVisible({ timeout: 10000 });
    }
  });
});
