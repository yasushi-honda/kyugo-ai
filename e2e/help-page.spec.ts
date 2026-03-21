import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

/**
 * ヘルプページのセクション定義（HELP_SECTIONS と同期）
 * セクション追加時はここに追加するだけでテストが追従する
 */
const EXPECTED_SECTIONS = [
  { id: "dashboard", title: "ダッシュボード（ケース一覧）", hasImage: true },
  { id: "new-case", title: "新規ケースの作成", hasImage: true },
  { id: "case-detail", title: "ケース詳細の確認", hasImage: true },
  { id: "text-consultation", title: "テキストで相談を記録する", hasImage: true },
  { id: "audio-recording", title: "音声で相談を記録する（直接録音）", hasImage: true },
  { id: "audio-file-upload", title: "音声で相談を記録する（ファイルアップロード）", hasImage: true },
  { id: "ai-analysis", title: "AI分析結果の見方", hasImage: true },
  { id: "edit-delete-consultation", title: "相談記録の編集・削除", hasImage: true },
  { id: "support-plan", title: "支援計画書の作成", hasImage: true },
  { id: "monitoring-sheet", title: "モニタリングシートの作成", hasImage: true },
  { id: "legal-search", title: "法令・制度の検索", hasImage: true },
  { id: "settings-whitelist", title: "ログイン許可設定", hasImage: true },
  { id: "settings-accounts", title: "アカウント管理", hasImage: true },
  { id: "csv-export", title: "CSVエクスポート", hasImage: false },
];

const SECTION_COUNT = EXPECTED_SECTIONS.length;
const IMAGE_COUNT = EXPECTED_SECTIONS.filter((s) => s.hasImage).length;

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

  test(`全${SECTION_COUNT}セクションの見出しが表示される`, async ({ page }) => {
    const headings = page.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(SECTION_COUNT);
    for (const section of EXPECTED_SECTIONS) {
      await expect(page.getByRole("heading", { level: 2, name: section.title })).toBeVisible();
    }
  });

  test(`目次に${SECTION_COUNT}のアンカーリンクが存在する`, async ({ page }) => {
    const toc = page.locator(".help-toc");
    await expect(toc).toBeVisible();
    const links = toc.locator("a");
    await expect(links).toHaveCount(SECTION_COUNT);
    // 全アンカーリンクを検証（indexではなくid基準）
    for (const section of EXPECTED_SECTIONS) {
      await expect(toc.locator(`a[href="#${section.id}"]`)).toBeVisible();
    }
  });

  test(`全${IMAGE_COUNT}枚のスクリーンショット画像が読み込まれる`, async ({ page }) => {
    const images = page.locator(".help-screenshot img");
    await expect(images).toHaveCount(IMAGE_COUNT);
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      await img.scrollIntoViewIfNeeded();
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
