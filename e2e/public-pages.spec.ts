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

  test("未認証で保護ページにアクセスするとログインにリダイレクトされる", async ({ page }) => {
    await page.goto("/");

    // ローディング後にログインページまたはログインボタンが表示される
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible({ timeout: 10000 });
  });
});
