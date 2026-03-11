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

  it("disables button and shows loading state while signing in", async () => {
    vi.mocked(signInWithPopup).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

    expect(screen.getByText("ログイン中...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン中..." })).toBeDisabled();
  });

  it("ガイダンステキストを表示する", () => {
    render(<Login />);

    expect(screen.getByText(/組織のGoogleアカウント/)).toBeInTheDocument();
    expect(screen.getByText(/管理者にお問い合わせ/)).toBeInTheDocument();
  });

  describe("エラーメッセージ分岐", () => {
    it("ネットワークエラー時に接続確認を促す", async () => {
      const err = new Error("auth/network-request-failed");
      (err as Error & { code: string }).code = "auth/network-request-failed";
      vi.mocked(signInWithPopup).mockRejectedValue(err);
      const user = userEvent.setup();

      render(<Login />);
      await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

      await vi.waitFor(() => {
        expect(screen.getByText(/インターネット接続を確認/)).toBeInTheDocument();
      });
    });

    it("ポップアップブロック時にブロック解除を案内する", async () => {
      const err = new Error("auth/popup-blocked");
      (err as Error & { code: string }).code = "auth/popup-blocked";
      vi.mocked(signInWithPopup).mockRejectedValue(err);
      const user = userEvent.setup();

      render(<Login />);
      await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

      await vi.waitFor(() => {
        expect(screen.getByText(/ポップアップがブロック/)).toBeInTheDocument();
      });
    });

    it("ポップアップを閉じた時にヒント表示する（エラーではない）", async () => {
      const err = new Error("Firebase: Error (auth/popup-closed-by-user).");
      (err as Error & { code: string }).code = "auth/popup-closed-by-user";
      vi.mocked(signInWithPopup).mockRejectedValue(err);
      const user = userEvent.setup();

      render(<Login />);
      await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

      await vi.waitFor(() => {
        expect(screen.getByRole("button", { name: "Googleアカウントでログイン" })).toBeEnabled();
      });
      const hint = screen.getByText(/ログインウィンドウが閉じ/);
      expect(hint).toBeInTheDocument();
      expect(hint.className).toBe("login-hint");
    });

    it("不明なエラー時に汎用メッセージを表示する", async () => {
      vi.mocked(signInWithPopup).mockRejectedValue(new Error("Unknown error"));
      const user = userEvent.setup();

      render(<Login />);
      await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

      await vi.waitFor(() => {
        expect(screen.getByText(/ログインに失敗しました.*管理者にお問い合わせ/)).toBeInTheDocument();
      });
    });

    it("unauthorized-domain時にドメインエラーを表示する", async () => {
      const err = new Error("auth/unauthorized-domain");
      (err as Error & { code: string }).code = "auth/unauthorized-domain";
      vi.mocked(signInWithPopup).mockRejectedValue(err);
      const user = userEvent.setup();

      render(<Login />);
      await user.click(screen.getByRole("button", { name: "Googleアカウントでログイン" }));

      await vi.waitFor(() => {
        expect(screen.getByText(/このドメインからのログインは許可されていません/)).toBeInTheDocument();
      });
    });
  });
});
