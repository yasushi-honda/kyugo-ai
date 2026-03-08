import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";

beforeEach(() => {
  vi.mocked(signInWithRedirect).mockReset();
  vi.mocked(getRedirectResult).mockReset().mockResolvedValue(null);
});

describe("Login", () => {
  it("renders Google login button", async () => {
    render(<Login />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeEnabled();
    });
    expect(screen.getByText("救護AI")).toBeInTheDocument();
    expect(screen.getByText("福祉相談業務AI支援システム")).toBeInTheDocument();
  });

  it("calls signInWithRedirect on button click", async () => {
    vi.mocked(signInWithRedirect).mockResolvedValue(undefined as never);
    const user = userEvent.setup();

    render(<Login />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    expect(signInWithRedirect).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it("shows error on login failure", async () => {
    vi.mocked(signInWithRedirect).mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<Login />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    await waitFor(() => {
      expect(screen.getByText("ログインに失敗しました")).toBeInTheDocument();
    });
  });

  it("shows error when getRedirectResult fails", async () => {
    vi.mocked(getRedirectResult).mockRejectedValue(new Error("auth/internal-error"));

    render(<Login />);

    await waitFor(() => {
      expect(screen.getByText(/ログインに失敗しました/)).toBeInTheDocument();
    });
  });

  it("shows loading state while checking redirect result", () => {
    vi.mocked(getRedirectResult).mockReturnValue(new Promise(() => {}));

    render(<Login />);

    expect(screen.getByRole("button", { name: "ログイン中..." })).toBeDisabled();
  });
});
