import { generativeModel } from "../config.js";
import { AISummaryResult, AudioAnalysisResult, Consultation, SupportMenu } from "../types.js";

const SYSTEM_INSTRUCTION_TEXT = `あなたは福祉相談支援AIアシスタントです。
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

const SYSTEM_INSTRUCTION_AUDIO = `あなたは福祉相談支援AIアシスタントです。
音声データから相談内容を分析し、以下を行います：
1. 音声の文字起こし（話者が複数いる場合は話者を区別）
2. 相談内容の要約（200文字以内）
3. 適切な公的制度・支援メニューの提案（利用可能な支援メニューから選択）

回答は必ず以下のJSON形式で返してください：
{
  "transcript": "文字起こし全文",
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

function buildMenuList(menus: SupportMenu[]): string {
  return menus
    .map((m) => `- ID: ${m.id}, 名称: ${m.name}, カテゴリ: ${m.category}, 対象: ${m.eligibility}, 概要: ${m.description}`)
    .join("\n");
}

function parseAIResponse<T>(responseText: string | undefined, requiredFields: string[]): T {
  if (!responseText) {
    throw new Error("AI returned empty response");
  }
  const parsed = JSON.parse(responseText) as T;
  for (const field of requiredFields) {
    if ((parsed as Record<string, unknown>)[field] === undefined) {
      throw new Error(`AI response missing required field: ${field}`);
    }
  }
  return parsed;
}

// テキストベースの相談分析（既存）
export async function analyzeConsultation(
  consultation: Pick<Consultation, "content" | "transcript">,
  availableMenus: SupportMenu[],
): Promise<AISummaryResult> {
  const userPrompt = `## 相談内容
${consultation.content}

## 文字起こし
${consultation.transcript || "（なし）"}

## 利用可能な支援メニュー
${buildMenuList(availableMenus)}

上記の相談内容を分析し、要約と適切な支援メニューを提案してください。`;

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseAIResponse<AISummaryResult>(responseText, ["summary", "suggestedSupports"]);
}

// 音声ベースの相談分析（文字起こし + 要約 + 支援提案を1回で）
export async function analyzeAudioConsultation(
  audioBuffer: Buffer,
  mimeType: string,
  contextText: string,
  availableMenus: SupportMenu[],
): Promise<AudioAnalysisResult> {
  const audioBase64 = audioBuffer.toString("base64");

  const userPrompt = `## 相談の背景情報
${contextText || "（なし）"}

## 利用可能な支援メニュー
${buildMenuList(availableMenus)}

添付の音声データを聞き取り、文字起こし・要約・適切な支援メニューの提案を行ってください。`;

  const result = await generativeModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: userPrompt },
        ],
      },
    ],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION_AUDIO }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseAIResponse<AudioAnalysisResult>(responseText, ["transcript", "summary", "suggestedSupports"]);
}
