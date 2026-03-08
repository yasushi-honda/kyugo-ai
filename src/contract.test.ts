import { describe, it, expectTypeOf } from "vitest";
import type { AuthUser, Case, CaseStatus, Consultation, ConsultationType, AIStatus, SuggestedSupport, SupportMenu } from "./types.js";

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

// FE側のCase型を再定義（frontend/src/api.ts:Caseと同一であること）
// Timestamp→{_seconds}変換、id必須化、householdInfo/incomeInfoはRecord<string, string>
interface FrontendCase {
  id: string;
  clientName: string;
  clientId: string;
  dateOfBirth: { _seconds: number };
  householdInfo: Record<string, string>;
  incomeInfo: Record<string, string>;
  status: "active" | "referred" | "closed";
  assignedStaffId: string;
  createdAt: { _seconds: number };
  updatedAt: { _seconds: number };
}

// FE側のSupportMenu型を再定義（frontend/src/api.ts:SupportMenuと同一であること）
// FEはrelatedLaws, updatedAtを使わないため省略
interface FrontendSupportMenu {
  id: string;
  name: string;
  category: string;
  eligibility: string;
  description: string;
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

describe("FE↔BE contract: Case", () => {
  it("BE CaseStatus matches FE status union", () => {
    expectTypeOf<CaseStatus>().toEqualTypeOf<FrontendCase["status"]>();
  });

  it("FE Case shared fields exist in BE Case (excluding Timestamp/id/Record differences)", () => {
    // Timestamp→{_seconds}、id optional→required、Record<string, unknown>→Record<string, string>を除外
    type CaseSharedFields = Pick<Case,
      "clientName" | "clientId" | "status" | "assignedStaffId"
    >;
    type FECaseSharedFields = Pick<FrontendCase,
      "clientName" | "clientId" | "status" | "assignedStaffId"
    >;
    expectTypeOf<CaseSharedFields>().toMatchTypeOf<FECaseSharedFields>();
  });
});

describe("FE↔BE contract: SupportMenu", () => {
  it("FE SupportMenu fields are subset of BE SupportMenu", () => {
    // FEはrelatedLaws, updatedAtを省略しているが、使うフィールドはBEに存在すること
    type SupportMenuSharedFields = Pick<SupportMenu,
      "name" | "category" | "eligibility" | "description"
    >;
    type FESupportMenuSharedFields = Pick<FrontendSupportMenu,
      "name" | "category" | "eligibility" | "description"
    >;
    expectTypeOf<SupportMenuSharedFields>().toMatchTypeOf<FESupportMenuSharedFields>();
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
