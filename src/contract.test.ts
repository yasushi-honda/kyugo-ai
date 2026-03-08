import { describe, it, expectTypeOf } from "vitest";
import type { AuthUser, Consultation, ConsultationType, AIStatus, SuggestedSupport } from "./types.js";

// FE側のUserInfo型を再定義（frontend/src/api.ts:UserInfoと同一であること）
// FE側はTimestamp→{_seconds}変換があるが、UserInfoはTimestamp不使用なので直接比較可能
interface FrontendUserInfo {
  uid: string;
  email: string;
  role: "admin" | "staff";
  staffId: string;
}

// FE側のConsultation型を再定義（frontend/src/api.ts:Consultationと同一であること）
// Timestamp→{_seconds}変換、id必須化、aiRetryCount省略を反映
interface FrontendConsultation {
  id: string;
  caseId: string;
  staffId: string;
  content: string;
  transcript: string;
  summary: string;
  suggestedSupports: FrontendSuggestedSupport[];
  consultationType: "visit" | "counter" | "phone" | "online";
  aiStatus: "pending" | "completed" | "retry_pending" | "error";
  aiErrorMessage?: string;
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

interface FrontendSuggestedSupport {
  menuId: string;
  menuName: string;
  reason: string;
  relevanceScore: number;
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

describe("FE↔BE contract: Consultation", () => {
  it("BE ConsultationType matches FE consultationType union", () => {
    expectTypeOf<ConsultationType>().toEqualTypeOf<FrontendConsultation["consultationType"]>();
  });

  it("BE AIStatus matches FE aiStatus union", () => {
    expectTypeOf<AIStatus>().toEqualTypeOf<FrontendConsultation["aiStatus"]>();
  });

  it("BE SuggestedSupport is assignable to FE SuggestedSupport", () => {
    expectTypeOf<SuggestedSupport>().toMatchTypeOf<FrontendSuggestedSupport>();
  });

  it("FE Consultation fields are subset of BE Consultation (excluding Timestamp/id differences)", () => {
    // FEが期待するフィールドがBE型に存在することを確認
    // Timestamp→{_seconds}変換とid optional→requiredの差異は除外
    type ConsultationSharedFields = Pick<Consultation,
      "caseId" | "staffId" | "content" | "transcript" | "summary" |
      "suggestedSupports" | "consultationType" | "aiStatus" | "aiErrorMessage"
    >;
    type FESharedFields = Pick<FrontendConsultation,
      "caseId" | "staffId" | "content" | "transcript" | "summary" |
      "suggestedSupports" | "consultationType" | "aiStatus" | "aiErrorMessage"
    >;
    expectTypeOf<ConsultationSharedFields>().toMatchTypeOf<FESharedFields>();
  });
});
