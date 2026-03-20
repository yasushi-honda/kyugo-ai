import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

test.describe("ヘルプページ", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
    // ヘルプページに遷移
    const helpNav = page.locator(".sidebar-nav-item", { hasText: /使い方ガイド/ });
    await helpNav.click();
    await expect(page).toHaveURL(/\/help/);
  });

  test("ページヘッダーが表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "使い方ガイド" })).toBeVisible();
    await expect(page.getByText("福祉相談業務支援システムの基本的な操作方法")).toBeVisible();
  });

  test("全12セクションの見出しが表示される", async ({ page }) => {
    const expectedTitles = [
      "ダッシュボード（ケース一覧）",
      "新規ケースの作成",
      "ケース詳細の確認",
      "テキストで相談を記録する",
      "音声で相談を記録する（直接録音）",
      "音声で相談を記録する（ファイルアップロード）",
      "AI分析結果の見方",
      "支援計画書の作成",
      "モニタリングシートの作成",
      "法令・制度の検索",
      "ログイン許可設定",
      "アカウント管理",
    ];
    const headings = page.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(12);
    for (const title of expectedTitles) {
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    }
  });

  test("目次に12のアンカーリンクが存在する", async ({ page }) => {
    const toc = page.locator(".help-toc");
    await expect(toc).toBeVisible();
    const links = toc.locator("a");
    await expect(links).toHaveCount(12);
    // 代表的なアンカーリンクを確認
    await expect(links.nth(0)).toHaveAttribute("href", "#dashboard");
    await expect(links.nth(6)).toHaveAttribute("href", "#ai-analysis");
    await expect(links.nth(11)).toHaveAttribute("href", "#settings-accounts");
  });

  test("全12枚のスクリーンショット画像が読み込まれる", async ({ page }) => {
    const images = page.locator(".help-screenshot img");
    await expect(images).toHaveCount(12);
    // 各画像をスクロールして表示し（lazy loading対応）、読み込みを確認
    for (let i = 0; i < 12; i++) {
      const img = images.nth(i);
      await img.scrollIntoViewIfNeeded();
      // lazy loadの完了を待つ
      await img.evaluate((el: HTMLImageElement) => {
        if (el.complete) return;
        return new Promise<void>((resolve) => {
          el.addEventListener("load", () => resolve(), { once: true });
        });
      });
      const naturalWidth = await img.evaluate(
        (el: HTMLImageElement) => el.naturalWidth,
      );
      expect(naturalWidth, `画像 ${i + 1} が読み込まれていない`).toBeGreaterThan(0);
    }
  });

  test("AI分析セクションに重要注記が表示される", async ({ page }) => {
    const importantNote = page.locator(".help-note-important").first();
    await expect(importantNote).toBeVisible();
    await expect(importantNote).toContainText("AI分析結果はあくまで参考情報です");
  });

  test("フッターが表示される", async ({ page }) => {
    const footer = page.locator(".help-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("システム管理者までお問い合わせください");
  });
});
