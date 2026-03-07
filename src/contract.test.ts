import { describe, it, expectTypeOf } from "vitest";
import type { AuthUser } from "./types.js";

// FE側のUserInfo型を再定義（frontend/src/api.ts:UserInfoと同一であること）
// FE側はTimestamp→{_seconds}変換があるが、UserInfoはTimestamp不使用なので直接比較可能
interface FrontendUserInfo {
  uid: string;
  email: string;
  role: "admin" | "staff";
  staffId: string;
}

describe("FE↔BE contract: UserInfo / AuthUser", () => {
  it("BE AuthUser is assignable to FE UserInfo", () => {
    expectTypeOf<AuthUser>().toMatchTypeOf<FrontendUserInfo>();
  });

  it("FE UserInfo is assignable to BE AuthUser", () => {
    expectTypeOf<FrontendUserInfo>().toMatchTypeOf<AuthUser>();
  });

  it("AuthUser has exactly the expected keys", () => {
    expectTypeOf<keyof AuthUser>().toEqualTypeOf<"uid" | "email" | "role" | "staffId">();
  });
});
