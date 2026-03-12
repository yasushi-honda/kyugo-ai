import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

test.describe("管理者設定フロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    // 設定画面に遷移
    const settingsNav = page.locator(".sidebar-nav-item", { hasText: /設定/ });
    await expect(settingsNav).toBeVisible();
    await settingsNav.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("設定画面が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "アクセス設定" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン許可" })).toBeVisible();
    await expect(page.getByRole("button", { name: "アカウント管理" })).toBeVisible();
  });

  test("ホワイトリスト: メールアドレスが表示される", async ({ page }) => {
    // settings-tag内のメールアドレスを確認（サイドバーのe2e-test@example.comと区別）
    await expect(page.locator(".settings-tag-email", { hasText: "test@example.com" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".settings-tag-domain", { hasText: "@example.com" })).toBeVisible();
  });

  test("ホワイトリスト: メールアドレスを追加できる", async ({ page }) => {
    await page.getByPlaceholder("user@example.com").fill("new@test.com");
    await page.getByRole("button", { name: "追加" }).first().click();

    // タグとして追加される
    await expect(page.locator(".settings-tag-email", { hasText: "new@test.com" })).toBeVisible();
  });

  test("ホワイトリスト: 変更を保存できる", async ({ page }) => {
    await expect(page.locator(".settings-tag-email", { hasText: "test@example.com" })).toBeVisible({ timeout: 5000 });

    const saveBtn = page.getByText("変更を保存");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 成功メッセージ
    await expect(page.getByText("保存しました")).toBeVisible({ timeout: 5000 });
  });

  test("アカウント管理: 職員一覧が表示される", async ({ page }) => {
    await page.getByRole("button", { name: "アカウント管理" }).click();

    await expect(page.getByText("アカウント一覧")).toBeVisible({ timeout: 5000 });
    // テーブル行内で職員名を確認
    await expect(page.locator("tr", { hasText: "テスト職員" }).first()).toBeVisible();
    await expect(page.locator("tr", { hasText: "テスト職員2" })).toBeVisible();
  });

  test("アカウント管理: 自分のアカウントは操作不可", async ({ page }) => {
    await page.getByRole("button", { name: "アカウント管理" }).click();
    await expect(page.getByText("アカウント一覧")).toBeVisible({ timeout: 5000 });

    // 自分のバッジが表示される
    await expect(page.getByText("自分")).toBeVisible();
  });

  test("アカウント管理: 他の職員のロールを変更できる", async ({ page }) => {
    await page.getByRole("button", { name: "アカウント管理" }).click();
    await expect(page.getByText("テスト職員2", { exact: true })).toBeVisible({ timeout: 5000 });

    // テスト職員2のロールセレクトを見つけて変更
    const staffRow = page.locator("tr", { hasText: "テスト職員2" });
    const roleSelect = staffRow.locator("select");
    await roleSelect.selectOption("admin");

    // 成功メッセージ
    await expect(page.getByText(/ロールを管理者に変更しました/)).toBeVisible({ timeout: 5000 });
  });

  test("アカウント管理: 職員を無効化できる", async ({ page }) => {
    await page.getByRole("button", { name: "アカウント管理" }).click();
    await expect(page.getByText("テスト職員2", { exact: true })).toBeVisible({ timeout: 5000 });

    // テスト職員2の無効化ボタン
    const staffRow = page.locator("tr", { hasText: "テスト職員2" });
    const disableBtn = staffRow.getByText("無効化");
    await disableBtn.click();

    // 成功メッセージ
    await expect(page.getByText(/無効化しました/)).toBeVisible({ timeout: 5000 });
  });
});
