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

  it("renders all 6 section headings", () => {
    renderHelp();

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(6);
    expect(headings[0]).toHaveTextContent("ダッシュボード（ケース一覧）");
    expect(headings[1]).toHaveTextContent("新規ケースの作成");
    expect(headings[2]).toHaveTextContent("ケース詳細の確認");
    expect(headings[3]).toHaveTextContent("テキストで相談を記録する");
    expect(headings[4]).toHaveTextContent("音声ファイルで相談を記録する");
    expect(headings[5]).toHaveTextContent("AI分析結果の見方");
  });

  it("renders table of contents with anchor links", () => {
    renderHelp();

    const tocLinks = screen.getAllByRole("link");
    expect(tocLinks).toHaveLength(6);
    expect(tocLinks[0]).toHaveAttribute("href", "#dashboard");
    expect(tocLinks[5]).toHaveAttribute("href", "#ai-analysis");
  });

  it("renders screenshots with lazy loading", () => {
    renderHelp();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(6);
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
