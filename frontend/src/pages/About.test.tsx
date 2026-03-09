import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { About } from "./About";

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  );
}

describe("About", () => {
  it("renders hero heading", () => {
    renderAbout();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "すべての相談者に、最適な支援を届けるために。",
    );
  });

  it("renders system badge", () => {
    renderAbout();

    expect(screen.getByText("福祉相談業務AI支援システム")).toBeInTheDocument();
  });

  it("renders 3 feature cards", () => {
    renderAbout();

    expect(screen.getByText("相談記録のデジタル化")).toBeInTheDocument();
    expect(screen.getByText("AIによる自動分析・要約")).toBeInTheDocument();
    expect(screen.getByText("支援メニューの自動提案")).toBeInTheDocument();
  });

  it("renders 5 security points", () => {
    renderAbout();

    expect(screen.getByText("データは日本国内のみで保管")).toBeInTheDocument();
    expect(screen.getByText("通信・保存データの暗号化")).toBeInTheDocument();
    expect(screen.getByText("厳格なアクセス制御")).toBeInTheDocument();
    expect(screen.getByText("AIの学習にデータは使われません")).toBeInTheDocument();
    expect(screen.getByText("監査ログの記録")).toBeInTheDocument();
  });

  it("renders compliance note", () => {
    renderAbout();

    expect(
      screen.getByText(/地方公共団体における情報セキュリティポリシー/),
    ).toBeInTheDocument();
  });

  it("renders AI safety section", () => {
    renderAbout();

    expect(screen.getByText("安心して使えるAI")).toBeInTheDocument();
    expect(screen.getByText("あくまで「参考情報」として提示")).toBeInTheDocument();
    expect(screen.getByText("データが外部に出ない仕組み")).toBeInTheDocument();
  });

  it("renders data flow diagram", () => {
    renderAbout();

    expect(screen.getByText("データの流れ")).toBeInTheDocument();
    expect(screen.getByText("相談記録を入力")).toBeInTheDocument();
    expect(screen.getByText("分析結果を表示")).toBeInTheDocument();
  });

  it("renders login buttons", () => {
    renderAbout();

    const loginButtons = screen.getAllByRole("button", { name: "システムにログイン" });
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders footer with copyright", () => {
    renderAbout();

    expect(screen.getByText(/救護AI — 福祉相談業務AI支援システム/)).toBeInTheDocument();
  });

  it("renders help guide link section", () => {
    renderAbout();

    expect(screen.getByText("操作方法を詳しく見る")).toBeInTheDocument();
  });
});
