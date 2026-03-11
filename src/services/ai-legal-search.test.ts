import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config.js", () => ({
  generativeModel: { generateContent: vi.fn() },
  genAI: {
    models: {
      generateContent: vi.fn(),
    },
  },
  MODEL: "gemini-2.5-flash",
}));

import { searchLegalInfo } from "./ai.js";
import { genAI } from "../config.js";

const VALID_RESPONSE = JSON.stringify({
  references: [
    {
      lawName: "生活保護法",
      article: "第4条（保護の補足性）",
      summary: "資産・能力を活用しても生活できない場合に保護を適用",
      sourceUrl: "https://elaws.e-gov.go.jp/document?lawid=325AC0000000144",
      relevance: "申請要件の判断基準に直結",
    },
  ],
  legalBasis: "生活保護法第4条に基づき、保護の補足性原則が適用される。",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchLegalInfo", () => {
  it("parses a valid JSON response", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: VALID_RESPONSE,
      candidates: [{}],
    } as never);

    const result = await searchLegalInfo("生活保護の申請要件", "相談内容の要約");

    expect(result.references).toHaveLength(1);
    expect(result.references[0].lawName).toBe("生活保護法");
    expect(result.legalBasis).toContain("生活保護法第4条");
  });

  it("handles markdown code block wrapped response", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: "```json\n" + VALID_RESPONSE + "\n```",
      candidates: [{}],
    } as never);

    const result = await searchLegalInfo("テスト", "");

    expect(result.references).toHaveLength(1);
    expect(result.legalBasis).toContain("生活保護法");
  });

  it("handles response with surrounding text", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: "以下が検索結果です。\n\n" + VALID_RESPONSE + "\n\n参考にしてください。",
      candidates: [{}],
    } as never);

    const result = await searchLegalInfo("テスト", "");

    expect(result.references).toHaveLength(1);
  });

  it("throws when response text is empty", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: undefined,
      candidates: [],
    } as never);

    await expect(searchLegalInfo("テスト", "")).rejects.toThrow(
      "AI returned empty response for legal search",
    );
  });

  it("throws when response contains no JSON", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: "JSONを含まないテキストレスポンス",
      candidates: [{}],
    } as never);

    await expect(searchLegalInfo("テスト", "")).rejects.toThrow(
      "AI response does not contain valid JSON for legal search",
    );
  });

  it("throws when JSON is missing required fields", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: JSON.stringify({ references: [] }),
      candidates: [{}],
    } as never);

    await expect(searchLegalInfo("テスト", "")).rejects.toThrow(
      /missing required field.*legalBasis/i,
    );
  });

  it("passes empty summaries as （なし）", async () => {
    vi.mocked(genAI.models.generateContent).mockResolvedValue({
      text: VALID_RESPONSE,
      candidates: [{}],
    } as never);

    await searchLegalInfo("テスト", "");

    const call = vi.mocked(genAI.models.generateContent).mock.calls[0][0] as { contents: string };
    expect(call.contents).toContain("（なし）");
  });
});
