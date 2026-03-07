import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "./Layout";
import { TestAuthWrapper } from "../test-utils";

function renderLayout(path = "/") {
  return render(
    <TestAuthWrapper>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <div data-testid="child-content">テストコンテンツ</div>
        </Layout>
      </MemoryRouter>
    </TestAuthWrapper>,
  );
}

describe("Layout", () => {
  it("renders sidebar brand", () => {
    renderLayout();

    expect(screen.getByText("救")).toBeInTheDocument();
    expect(screen.getByText("救護AI")).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    renderLayout();

    expect(screen.getByText("ケース一覧")).toBeInTheDocument();
  });

  it("renders children in main content area", () => {
    renderLayout();

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  it("highlights active nav item for current path", () => {
    renderLayout("/");

    const navItem = screen.getByText("ケース一覧").closest(".sidebar-nav-item");
    expect(navItem).toHaveClass("active");
  });

  it("renders logout button and user email in footer", () => {
    renderLayout();

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("ログアウト")).toBeInTheDocument();
  });

  it("navigates when nav item is clicked", async () => {
    renderLayout("/cases/1");
    const user = userEvent.setup();

    const navItem = screen.getByText("ケース一覧");
    await user.click(navItem);

    // After clicking, the nav item should be active (navigated to "/")
    const parentItem = navItem.closest(".sidebar-nav-item");
    expect(parentItem).toHaveClass("active");
  });
});
