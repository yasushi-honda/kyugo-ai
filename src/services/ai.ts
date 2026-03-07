import { generativeModel } from "../config.js";
import { AISummaryResult, Consultation, SupportMenu } from "../types.js";

const SYSTEM_INSTRUCTION = `あなたは福祉相談支援AIアシスタントです。
生活困窮者の相談内容を分析し、以下を行います：
1. 相談内容の要約（200文字以内）
2. 適切な公的制度・支援メニューの提案（利用可能な支援メニューから選択）

回答は必ず以下のJSON形式で返してください：
{
  "summary": "相談内容の要約",
  "suggestedSupports": [
    {
      "menuId": "支援メニューID",
      "menuName": "支援メニュー名",
      "reason": "提案理由",
      "relevanceScore": 0.0〜1.0の関連度スコア
    }
  ]
}`;

export async function analyzeConsultation(
  consultation: Pick<Consultation, "content" | "transcript">,
  availableMenus: SupportMenu[],
): Promise<AISummaryResult> {
  const menuList = availableMenus
    .map((m) => `- ID: ${m.id}, 名称: ${m.name}, カテゴリ: ${m.category}, 対象: ${m.eligibility}, 概要: ${m.description}`)
    .join("\n");

  const userPrompt = `## 相談内容
${consultation.content}

## 文字起こし
${consultation.transcript || "（なし）"}

## 利用可能な支援メニュー
${menuList}

上記の相談内容を分析し、要約と適切な支援メニューを提案してください。`;

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("AI returned empty response");
  }

  const parsed: AISummaryResult = JSON.parse(responseText);

  if (!parsed.summary || !Array.isArray(parsed.suggestedSupports)) {
    throw new Error("AI response missing required fields");
  }

  return parsed;
}
