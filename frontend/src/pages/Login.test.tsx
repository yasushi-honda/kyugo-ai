import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";
import { signInWithEmailAndPassword } from "firebase/auth";

beforeEach(() => {
  vi.mocked(signInWithEmailAndPassword).mockReset();
});

describe("Login", () => {
  it("renders login form fields", () => {
    render(<Login />);

    expect(screen.getByText("救護AI")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("calls signInWithEmailAndPassword on submit", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as never);
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText("メールアドレス"), "staff@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "staff@example.com",
      "password123",
    );
  });

  it("shows error on invalid credentials", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
      new Error("Firebase: Error (auth/invalid-credential)."),
    );
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText("メールアドレス"), "wrong@test.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await vi.waitFor(() => {
      expect(screen.getByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument();
    });
  });

  it("shows generic error on unknown failure", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
      new Error("Network error"),
    );
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await vi.waitFor(() => {
      expect(screen.getByText("ログインに失敗しました")).toBeInTheDocument();
    });
  });

  it("disables inputs and shows loading state while submitting", async () => {
    vi.mocked(signInWithEmailAndPassword).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@test.com");
    await user.type(screen.getByLabelText("パスワード"), "pass");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
    expect(screen.getByText("ログイン中...")).toBeInTheDocument();
  });
});
