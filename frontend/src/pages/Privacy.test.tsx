import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Privacy } from "./Privacy";

function renderPrivacy() {
  return render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>,
  );
}

describe("Privacy", () => {
  it("renders page heading", () => {
    renderPrivacy();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("プライバシーポリシー");
  });

  it("renders key sections", () => {
    renderPrivacy();
    expect(screen.getByText("1. 基本方針")).toBeInTheDocument();
    expect(screen.getByText("2. 収集する情報")).toBeInTheDocument();
    expect(screen.getByText("5. AI処理に関する方針")).toBeInTheDocument();
    expect(screen.getByText("10. お問い合わせ")).toBeInTheDocument();
  });

  it("mentions data storage location", () => {
    renderPrivacy();
    expect(screen.getByText(/東京リージョン（asia-northeast1）/)).toBeInTheDocument();
  });

  it("renders footer with navigation links", () => {
    renderPrivacy();
    expect(screen.getByRole("link", { name: "救護AIについて" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute("href", "/privacy");
  });
});
