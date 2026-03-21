import { test, expect } from "@playwright/test";

test.describe("公開ページ（認証不要）", () => {
  test("Aboutページが表示される", async ({ page }) => {
    await page.goto("/about");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("救護AIでできること")).toBeVisible();
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");

    // Googleログインボタンが存在する
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("利用規約ページが表示される", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("h1")).toHaveText("利用規約");
    await expect(page.getByText("第1条（適用）")).toBeVisible();
    await expect(page.getByText("第10条（準拠法・管轄）")).toBeVisible();
  });

  test("プライバシーポリシーページが表示される", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.locator("h1")).toHaveText("プライバシーポリシー");
    await expect(page.getByText("1. 基本方針")).toBeVisible();
    await expect(page.getByText("asia-northeast1")).toBeVisible();
  });

  test("利用規約からプライバシーポリシーへ遷移できる", async ({ page }) => {
    await page.goto("/terms");

    // 本文内のプライバシーポリシーリンクをクリック
    await page.getByRole("link", { name: "プライバシーポリシー" }).first().click();
    await expect(page.locator("h1")).toHaveText("プライバシーポリシー");
  });

  test("未認証で保護ページにアクセスするとログインにリダイレクトされる", async ({ page }) => {
    await page.goto("/");

    // ローディング後にログインページまたはログインボタンが表示される
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible({ timeout: 10000 });
  });
});
