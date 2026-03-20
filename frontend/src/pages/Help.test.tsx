import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Help } from "./Help";

function renderHelp() {
  return render(
    <MemoryRouter>
      <Help />
    </MemoryRouter>,
  );
}

describe("Help", () => {
  it("renders page header", () => {
    renderHelp();

    expect(screen.getByText("使い方ガイド")).toBeInTheDocument();
    expect(screen.getByText(/福祉相談業務支援システム/)).toBeInTheDocument();
  });

  it("renders all 13 section headings", () => {
    renderHelp();

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(13);
    expect(headings[0]).toHaveTextContent("ダッシュボード（ケース一覧）");
    expect(headings[1]).toHaveTextContent("新規ケースの作成");
    expect(headings[2]).toHaveTextContent("ケース詳細の確認");
    expect(headings[3]).toHaveTextContent("テキストで相談を記録する");
    expect(headings[4]).toHaveTextContent("音声で相談を記録する（直接録音）");
    expect(headings[5]).toHaveTextContent("音声で相談を記録する（ファイルアップロード）");
    expect(headings[6]).toHaveTextContent("AI分析結果の見方");
    expect(headings[7]).toHaveTextContent("相談記録の編集・削除");
    expect(headings[8]).toHaveTextContent("支援計画書の作成");
    expect(headings[9]).toHaveTextContent("モニタリングシートの作成");
    expect(headings[10]).toHaveTextContent("法令・制度の検索");
    expect(headings[11]).toHaveTextContent("ログイン許可設定");
    expect(headings[12]).toHaveTextContent("アカウント管理");
  });

  it("renders table of contents with anchor links", () => {
    renderHelp();

    const tocLinks = screen.getAllByRole("link");
    expect(tocLinks).toHaveLength(13);
    expect(tocLinks[0]).toHaveAttribute("href", "#dashboard");
    expect(tocLinks[4]).toHaveAttribute("href", "#audio-recording");
    expect(tocLinks[5]).toHaveAttribute("href", "#audio-file-upload");
    expect(tocLinks[6]).toHaveAttribute("href", "#ai-analysis");
    expect(tocLinks[7]).toHaveAttribute("href", "#edit-delete-consultation");
    expect(tocLinks[12]).toHaveAttribute("href", "#settings-accounts");
  });

  it("renders screenshots with lazy loading", () => {
    renderHelp();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(13);
    images.forEach((img) => {
      expect(img).toHaveAttribute("loading", "lazy");
    });
  });

  it("renders important note for AI analysis section", () => {
    renderHelp();

    expect(
      screen.getByText(/AI分析結果はあくまで参考情報です/),
    ).toBeInTheDocument();
  });

  it("renders footer", () => {
    renderHelp();

    expect(
      screen.getByText(/システム管理者までお問い合わせください/),
    ).toBeInTheDocument();
  });
});
