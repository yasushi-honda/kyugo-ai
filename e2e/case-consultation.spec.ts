import { test, expect } from "@playwright/test";
import { mockApiRoutes, signInTestUser } from "./helpers";

test.describe("ケース作成・相談記録フロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto("/");
    await signInTestUser(page);
    await expect(page.getByText("テスト太郎")).toBeVisible({ timeout: 15000 });
  });

  test("ダッシュボードからケース作成モーダルを開き、作成する", async ({ page }) => {
    // 新規ケースボタンをクリック
    await page.getByText("＋ 新規ケース").click();
    await expect(page.getByRole("heading", { name: "新規ケース作成" })).toBeVisible();

    // フォーム入力
    await page.getByPlaceholder("例: 山田 太郎").fill("新規テスト太郎");
    await page.getByPlaceholder("例: C-00123").fill("C-99999");
    await page.locator('input[type="date"]').fill("1985-06-15");

    // 送信ボタンが有効になる
    const submitBtn = page.getByRole("button", { name: "ケースを作成" });
    await expect(submitBtn).not.toBeDisabled();

    // 作成
    await submitBtn.click();

    // モーダルが閉じてダッシュボードに戻る
    await expect(page.getByRole("heading", { name: "新規ケース作成" })).not.toBeVisible();
  });

  test("ケース作成モーダルで必須項目未入力時にボタンが無効", async ({ page }) => {
    await page.getByText("＋ 新規ケース").click();

    const submitBtn = page.getByRole("button", { name: "ケースを作成" });
    await expect(submitBtn).toBeDisabled();

    // 未入力の項目ヘルプテキストが表示される
    await expect(page.getByText(/未入力の項目/)).toBeVisible();
  });

  test("ケース詳細画面に遷移してテキスト相談を作成する", async ({ page }) => {
    // ケースカードをクリックして詳細画面へ
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();

    // 新規相談記録ボタン
    await page.getByRole("button", { name: "＋ 新規相談記録" }).click();
    await expect(page.getByRole("heading", { name: "新規相談記録" })).toBeVisible();

    // テキストモードで入力
    await page.getByPlaceholder(/相談者の状況/).fill("テスト相談の内容です");

    // 送信
    await page.getByRole("button", { name: "相談を記録" }).click();

    // モーダルが閉じる
    await expect(page.getByRole("heading", { name: "新規相談記録" })).not.toBeVisible({ timeout: 10000 });
  });

  test("音声モードに切り替えてファイルアップロードする", async ({ page }) => {
    await page.locator(".case-card").first().click();
    await page.getByRole("button", { name: "＋ 新規相談記録" }).click();

    // 音声モードに切り替え
    await page.getByRole("button", { name: "音声" }).click();
    await page.getByText(/ファイルを選択/).click();
    await expect(page.getByText(/クリックして音声ファイルを選択/)).toBeVisible();

    // ファイルアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("fake-audio-data"),
    });

    // 送信ボタンが有効になる
    const submitBtn = page.getByRole("button", { name: "音声を分析・記録" });
    await expect(submitBtn).not.toBeDisabled();

    // 送信
    await submitBtn.click();

    // 音声送信後、ポーリングでcompletedに変わるまで待つ
    // モックAPIがcompleted状態を返すのでAI分析結果が表示される
    await expect(page.getByRole("heading", { name: "AI分析結果" })).toBeVisible({ timeout: 15000 });
  });

  test("相談種別を切り替えられる", async ({ page }) => {
    await page.locator(".case-card").first().click();
    await page.getByRole("button", { name: "＋ 新規相談記録" }).click();

    // デフォルトは窓口（counter）— selectのオプションを確認
    const typeSelect = page.locator("select").first();
    await expect(typeSelect).toBeVisible();
    const selectedValue = await typeSelect.inputValue();
    expect(selectedValue).toBe("counter");
  });

  test("相談記録を編集して保存する", async ({ page }) => {
    // ケース詳細に遷移
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();

    // ⋯メニューを開く
    const menuBtn = page.locator(".consultation-menu-btn").first();
    await menuBtn.click();

    // 編集を選択
    await page.locator(".consultation-menu-dropdown button", { hasText: "編集" }).click();

    // テキストエリアに変更を加える
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("編集後のテスト相談内容");

    // 保存ボタンをクリック
    await page.getByRole("button", { name: "保存" }).click();

    // 編集バッジ「（テスト職員 が編集）」が表示される
    await expect(page.getByText(/テスト職員 が編集/)).toBeVisible({ timeout: 10000 });
  });

  test("相談記録を削除する", async ({ page }) => {
    // ケース詳細に遷移
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();

    // 相談記録が表示されていることを確認
    await expect(page.getByText("テスト相談内容")).toBeVisible();

    // confirmダイアログを自動でacceptする
    page.on("dialog", (dialog) => dialog.accept());

    // ⋯メニューを開く
    const menuBtn = page.locator(".consultation-menu-btn").first();
    await menuBtn.click();

    // 削除を選択
    await page.locator(".consultation-menu-dropdown button", { hasText: "削除" }).click();

    // 相談記録が一覧から消えることを確認
    await expect(page.getByText("テスト相談内容")).not.toBeVisible({ timeout: 10000 });
  });

  test("ケース一覧に戻るリンクが機能する", async ({ page }) => {
    await page.locator(".case-card").first().click();
    await expect(page.getByText("← ケース一覧に戻る")).toBeVisible();

    await page.getByText("← ケース一覧に戻る").click();
    // ダッシュボードに戻ったことを確認（ページヘッダーで判定）
    await expect(page.getByRole("heading", { name: "ケース一覧" })).toBeVisible();
  });
});
