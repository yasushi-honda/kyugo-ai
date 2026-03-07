import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CaseDetail } from "./pages/CaseDetail";

vi.mock("./api", () => ({
  api: {
    listCases: vi.fn().mockResolvedValue([]),
    getCase: vi.fn().mockResolvedValue(null),
    listConsultations: vi.fn().mockResolvedValue([]),
  },
}));

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
        </Routes>
      </Layout>
    </MemoryRouter>,
  );
}

describe("App routing", () => {
  it("renders Dashboard on /", async () => {
    renderApp("/");

    await waitFor(() => {
      expect(screen.getByText("ケース一覧", { selector: "h1" })).toBeInTheDocument();
    });
  });

  it("renders CaseDetail on /cases/:id", async () => {
    renderApp("/cases/case-1");

    await waitFor(() => {
      expect(screen.getByText("ケースが見つかりません")).toBeInTheDocument();
    });
  });

  it("renders empty content for unknown routes", () => {
    renderApp("/unknown-path");

    // Layout should still render
    expect(screen.getByText("救護AI")).toBeInTheDocument();
    // But no page content (no dashboard or case detail)
    expect(screen.queryByText("ケース一覧", { selector: "h1" })).not.toBeInTheDocument();
  });
});
