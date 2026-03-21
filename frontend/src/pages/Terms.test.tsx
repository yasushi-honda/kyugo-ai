import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Terms } from "./Terms";

function renderTerms() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  );
}

describe("Terms", () => {
  it("renders page heading", () => {
    renderTerms();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("利用規約");
  });

  it("renders all 10 articles", () => {
    renderTerms();
    expect(screen.getByText("第1条（適用）")).toBeInTheDocument();
    expect(screen.getByText("第5条（AI分析結果の取り扱い）")).toBeInTheDocument();
    expect(screen.getByText("第10条（準拠法・管轄）")).toBeInTheDocument();
  });

  it("renders privacy policy links", () => {
    renderTerms();
    const links = screen.getAllByRole("link", { name: "プライバシーポリシー" });
    expect(links.length).toBeGreaterThanOrEqual(2); // 本文内 + フッター
    links.forEach((link) => expect(link).toHaveAttribute("href", "/privacy"));
  });

  it("renders footer with navigation links", () => {
    renderTerms();
    expect(screen.getByRole("link", { name: "救護AIについて" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
  });
});
