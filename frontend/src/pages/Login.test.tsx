import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";
import { signInWithPopup } from "firebase/auth";

beforeEach(() => {
  vi.mocked(signInWithPopup).mockReset();
});

describe("Login", () => {
  it("renders Google login button", () => {
    render(<Login />);

    expect(screen.getByText("救護AI")).toBeInTheDocument();
    expect(screen.getByText("福祉相談業務AI支援システム")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeInTheDocument();
  });

  it("calls signInWithPopup on button click", async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);
    const user = userEvent.setup();

    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    expect(signInWithPopup).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it("shows error on login failure", async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    await vi.waitFor(() => {
      expect(screen.getByText("ログインに失敗しました")).toBeInTheDocument();
    });
  });

  it("does not show error when popup is closed by user", async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(
      new Error("Firebase: Error (auth/popup-closed-by-user)."),
    );
    const user = userEvent.setup();

    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeEnabled();
    });
    expect(screen.queryByText("ログインに失敗しました")).not.toBeInTheDocument();
  });

  it("disables button and shows loading state while signing in", async () => {
    vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    expect(screen.getByText("ログイン中...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン中..." })).toBeDisabled();
  });
});
