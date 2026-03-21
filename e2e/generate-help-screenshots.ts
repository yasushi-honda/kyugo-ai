/**
 * ヘルプページ用スクリーンショット自動生成スクリプト
 *
 * 使用方法:
 *   1. Firebase Auth Emulatorを起動: firebase emulators:start --only auth --project demo-e2e
 *   2. フロントエンド開発サーバーを起動: cd frontend && npm run dev
 *   3. npx playwright test --config playwright.config.ts e2e/generate-help-screenshots.ts
 *
 * または npm script:
 *   npm run generate:help-screenshots
 */
import { test } from "@playwright/test";
import { DEMO_STAFF_EMAIL, mockApiRoutesForHelp, signInTestUser } from "./helpers";
import path from "path";

const OUTPUT_DIR = path.resolve("frontend/public/help");
const VIEWPORT = { width: 1440, height: 900 };

/** モーダル内のdisabled input（職員メール）をデモ用に置換 */
async function replaceStaffEmail(page: import("@playwright/test").Page) {
  await page.evaluate((demoEmail) => {
    document.querySelectorAll<HTMLInputElement>("input[disabled]").forEach((input) => {
      if (input.value.includes("@")) {
        // Reactのstate管理を迂回してDOM直接変更
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, "value",
        )?.set;
        nativeInputValueSetter?.call(input, demoEmail);
      }
    });
  }, DEMO_STAFF_EMAIL);
}

test.describe("ヘルプ用スクリーンショット生成", () => {
  test.use({ viewport: VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await mockApiRoutesForHelp(page);
    await page.goto("/");
    await signInTestUser(page);
    // ダッシュボード表示を待つ
    await page.getByText("山田 花子").waitFor({ timeout: 15000 });
    // スクリーンショット用の表示調整
    await page.evaluate((demoEmail) => {
      // エミュレータ警告バナーを非表示
      const banner = document.querySelector(".firebase-emulator-warning");
      if (banner) (banner as HTMLElement).style.display = "none";
      // サイドバーのメールアドレスをデモ用に置換
      document.querySelectorAll("*").forEach((el) => {
        if (el.children.length === 0 && el.textContent?.includes("e2e-test@example.com")) {
          el.textContent = demoEmail;
        }
      });
    }, DEMO_STAFF_EMAIL);
  });

  test("1. ダッシュボード", async ({ page }) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "dashboard.png") });
  });

  test("2. 新規ケース作成モーダル", async ({ page }) => {
    await page.getByRole("button", { name: /新規ケース/ }).click();
    await page.getByText("新規ケース作成").waitFor();
    await replaceStaffEmail(page);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "new-case-modal.png"),
    });
    // モーダルを閉じる
    await page.getByRole("button", { name: /キャンセル/ }).click();
  });

  test("3. ケース詳細", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "case-detail.png"),
    });
  });

  test("4. テキスト相談入力モーダル", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /新規相談記録/ }).click();
    await page.getByRole("heading", { name: "新規相談記録" }).waitFor();
    await replaceStaffEmail(page);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "new-consultation-modal.png"),
    });
  });

  test("5. 音声録音モーダル", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /新規相談記録/ }).click();
    await page.getByRole("heading", { name: "新規相談記録" }).waitFor();
    // 音声タブに切り替え
    await page.getByRole("button", { name: "音声" }).click();
    await replaceStaffEmail(page);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "audio-recording.png"),
    });
  });

  test("6. 音声ファイルアップロードモーダル", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /新規相談記録/ }).click();
    await page.getByRole("heading", { name: "新規相談記録" }).waitFor();
    // 音声タブ → ファイルアップロードモード
    await page.getByRole("button", { name: "音声" }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: /ファイルを選択/ }).click();
    await replaceStaffEmail(page);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "audio-consultation.png"),
    });
  });

  test("7. AI分析結果", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    // AI分析結果パネルが表示されるまで待つ（複数相談記録があるため .first() を使用）
    const aiPanel = page.locator(".ai-panel").first();
    await aiPanel.waitFor({ timeout: 10000 });
    // AI分析結果セクションまでスクロール
    await aiPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // AI分析結果部分のみをキャプチャ（要約+支援メニュー提案）
    // パネルの周囲コンテキストも含めてスクリーンショット
    // まずAIパネルの位置を取得して、その領域をページスクリーンショットでクリップ
    const box = await aiPanel.boundingBox();
    if (box) {
      // AIパネルの上にある相談内容も少し含める
      const clipY = Math.max(0, box.y - 80);
      const clipHeight = box.height + 120;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, "ai-analysis.png"),
        clip: {
          x: Math.max(0, box.x - 20),
          y: clipY,
          width: Math.min(box.width + 40, VIEWPORT.width),
          height: Math.min(clipHeight, VIEWPORT.height),
        },
      });
    } else {
      // フォールバック: 要素スクリーンショット
      await aiPanel.screenshot({
        path: path.join(OUTPUT_DIR, "ai-analysis.png"),
      });
    }
  });

  test("7.5. 相談記録の編集メニュー", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    // ⋯メニューをクリックして開いた状態でスクリーンショット
    const menuBtn = page.locator(".consultation-menu-btn").first();
    await menuBtn.click();
    await page.locator(".consultation-menu-dropdown").waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "edit-consultation.png"),
    });
  });

  test("8. 支援計画書タブ", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    // 支援計画書タブに切り替え（button.detail-tab）
    await page.locator(".detail-tab", { hasText: /支援計画書/ }).click();
    await page.locator(".support-plan").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "support-plan.png"),
    });
  });

  test("9. モニタリングシート", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    // モニタリングタブに切り替え（button.detail-tab）
    await page.locator(".detail-tab", { hasText: /モニタリング/ }).click();
    await page.locator(".support-plan").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "monitoring-sheet.png"),
    });
  });

  test("10. 法令検索タブ", async ({ page }) => {
    await page.getByText("山田 花子").click();
    await page.locator(".consultation-timeline").waitFor({ timeout: 10000 });
    // 法令検索タブに切り替え（button.detail-tab）
    await page.locator(".detail-tab", { hasText: /法令検索/ }).click();
    await page.locator(".legal-search-view").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "legal-search.png"),
    });
  });

  test("11. アクセス設定（ログイン許可）", async ({ page }) => {
    // サイドバーからアクセス設定に遷移
    const settingsNav = page.locator(".sidebar-nav-item", { hasText: /アクセス設定/ });
    await settingsNav.click();
    await page.waitForURL(/\/settings/);
    // ログイン許可タブがデフォルトで表示される
    await page.locator(".settings-layout").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "settings-whitelist.png"),
    });
  });

  test("12. アクセス設定（アカウント管理）", async ({ page }) => {
    // サイドバーからアクセス設定に遷移
    const settingsNav = page.locator(".sidebar-nav-item", { hasText: /アクセス設定/ });
    await settingsNav.click();
    await page.waitForURL(/\/settings/);
    // アカウント管理タブに切り替え
    await page.getByRole("button", { name: /アカウント管理/ }).click();
    await page.locator(".staff-table").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "settings-accounts.png"),
    });
  });
});
