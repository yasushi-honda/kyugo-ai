import { generativeModel, genAI, MODEL } from "../config.js";
import { AILegalSearchResult, AIMonitoringResult, AISummaryResult, AISupportPlanResult, AudioAnalysisResult, Case, Consultation, LegalReference, SupportMenu, SupportPlan } from "../types.js";

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

function buildConsultationSummaries(consultations: Consultation[]): string {
  return consultations
    .filter((c) => c.aiStatus === "completed" && c.summary)
    .map((c) => {
      const supports = c.suggestedSupports
        .map((s) => `  - ${s.menuName}（${s.reason}、関連度: ${Math.round(s.relevanceScore * 100)}%）`)
        .join("\n");
      return `### ${c.consultationType} 相談（${c.createdAt}）
内容: ${c.content}
AI要約: ${c.summary}
提案された支援メニュー:
${supports || "  なし"}`;
    })
    .join("\n\n");
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
      maxOutputTokens: 4096,
    },
  });

  const candidate = result.response.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;
  if (!responseText) {
    console.error("Vertex AI empty response", JSON.stringify({
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      candidatesCount: result.response.candidates?.length ?? 0,
    }));
  }
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

  const audioCandidate = result.response.candidates?.[0];
  const responseText = audioCandidate?.content?.parts?.[0]?.text;
  if (!responseText) {
    console.error("Vertex AI empty audio response", JSON.stringify({
      finishReason: audioCandidate?.finishReason,
      safetyRatings: audioCandidate?.safetyRatings,
      candidatesCount: result.response.candidates?.length ?? 0,
    }));
  }
  return parseAIResponse<AudioAnalysisResult>(responseText, ["transcript", "summary", "suggestedSupports"]);
}

// 個別支援計画書の下書き生成
const SYSTEM_INSTRUCTION_SUPPORT_PLAN = `あなたは救護施設の個別支援計画策定を支援するAIアシスタントです。
厚生労働省委託「救護施設・更生施設における個別支援計画 策定導入マニュアル」（令和6年3月、全社協発行）の標準様式に準拠した
個別支援計画書の下書きを生成します。

以下の原則に従ってください：
- 利用者本人の希望・意向を最大限尊重した目標設定
- ICF（国際生活機能分類）の視点で生活機能を多面的に評価
- 長期目標は6ヶ月〜1年、短期目標は3ヶ月程度の期間設定
- 具体的・測定可能な目標表現（「〜できるようになる」「〜の頻度を週X回にする」等）
- 支援領域は日常生活・健康管理・社会参加・経済的自立等から該当するものを選択

回答は必ず以下のJSON形式で返してください：
{
  "overallPolicy": "全体的な支援方針（利用者の状況と目指す方向性を200文字以内で）",
  "goals": [
    {
      "area": "支援領域（例: 日常生活、健康管理、社会参加、経済的自立）",
      "longTermGoal": "長期目標（6ヶ月〜1年）",
      "shortTermGoal": "短期目標（3ヶ月）",
      "supports": ["具体的な支援内容1", "具体的な支援内容2"],
      "frequency": "支援頻度（例: 毎日、週3回、月1回）",
      "responsible": "担当者・機関（例: 生活支援員、看護師、外部医療機関）"
    }
  ],
  "specialNotes": "特記事項（アレルギー、服薬情報、家族関係等、支援上の留意点）"
}`;

export async function generateSupportPlanDraft(
  caseData: Case,
  consultations: Consultation[],
  availableMenus: SupportMenu[],
): Promise<AISupportPlanResult> {
  const consultationSummaries = buildConsultationSummaries(consultations);

  const userPrompt = `## 利用者情報
- 氏名: ${caseData.clientName}
- ID: ${caseData.clientId}
- 生年月日: ${caseData.dateOfBirth}
- ケース状態: ${caseData.status}

## 世帯情報
${JSON.stringify(caseData.householdInfo || {})}

## 収入情報
${JSON.stringify(caseData.incomeInfo || {})}

## 相談記録（${consultations.length}件）
${consultationSummaries || "（相談記録なし）"}

## 利用可能な支援メニュー
${buildMenuList(availableMenus)}

上記の情報を基に、この利用者の個別支援計画書の下書きを作成してください。
相談記録のAI要約と提案された支援メニューを踏まえ、具体的な長期・短期目標と支援内容を提案してください。`;

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION_SUPPORT_PLAN }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  });

  const candidate = result.response.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;
  if (!responseText) {
    console.error("Vertex AI empty support plan response", JSON.stringify({
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      candidatesCount: result.response.candidates?.length ?? 0,
    }));
  }
  return parseAIResponse<AISupportPlanResult>(responseText, ["overallPolicy", "goals", "specialNotes"]);
}

// モニタリングシートの下書き生成
const SYSTEM_INSTRUCTION_MONITORING = `あなたは救護施設の個別支援計画モニタリングを支援するAIアシスタントです。
厚生労働省委託「救護施設・更生施設における個別支援計画 策定導入マニュアル」（令和6年3月、全社協発行）のモニタリング様式に準拠した
モニタリングシートの下書きを生成します。

以下の原則に従ってください：
- 個別支援計画書の各目標に対して、相談記録の経時変化から進捗を客観的に評価
- progress は "improved"（改善）、"maintained"（維持）、"declined"（後退）、"not_started"（未着手）のいずれか
- 具体的なエピソードや数値変化を根拠として挙げる
- 本人の意向・感想は相談記録中の発言をもとに推測
- 生活環境の変化は世帯構成・収入・住居等の変化を記述

回答は必ず以下のJSON形式で返してください：
{
  "overallEvaluation": "全体的な評価（支援計画全体の進捗と今後の方向性を200文字以内で）",
  "goalEvaluations": [
    {
      "area": "支援領域（支援計画書のareaと一致させる）",
      "longTermGoal": "長期目標（支援計画書から転記）",
      "shortTermGoal": "短期目標（支援計画書から転記）",
      "progress": "improved | maintained | declined | not_started",
      "evaluation": "達成状況の評価（具体的根拠を含めて）",
      "nextAction": "今後の対応方針"
    }
  ],
  "environmentChanges": "生活環境の変化（なければ「特になし」）",
  "clientFeedback": "本人の意向・感想（相談記録から推測）",
  "specialNotes": "特記事項（支援上の留意点の変化等）"
}`;

export async function generateMonitoringDraft(
  caseData: Case,
  supportPlan: SupportPlan,
  consultations: Consultation[],
): Promise<AIMonitoringResult> {
  const consultationSummaries = buildConsultationSummaries(consultations);

  const goalsText = supportPlan.goals
    .map((g, i) => `${i + 1}. 【${g.area}】
   長期目標: ${g.longTermGoal}
   短期目標: ${g.shortTermGoal}
   支援内容: ${g.supports.join("、")}
   頻度: ${g.frequency} / 担当: ${g.responsible}`)
    .join("\n");

  const userPrompt = `## 利用者情報
- 氏名: ${caseData.clientName}
- ID: ${caseData.clientId}
- ケース状態: ${caseData.status}

## 現行の個別支援計画書
- 計画期間: ${supportPlan.planStartDate} 〜 ${supportPlan.nextReviewDate}
- 全体方針: ${supportPlan.overallPolicy}

### 支援目標
${goalsText}

### 特記事項
${supportPlan.specialNotes || "（なし）"}

## 相談記録（時系列）
${consultationSummaries || "（相談記録なし）"}

上記の支援計画の各目標に対して、相談記録の経時変化を分析し、モニタリングシートの下書きを作成してください。`;

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION_MONITORING }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  });

  const candidate = result.response.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;
  if (!responseText) {
    console.error("Vertex AI empty monitoring response", JSON.stringify({
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      candidatesCount: result.response.candidates?.length ?? 0,
    }));
  }
  return parseAIResponse<AIMonitoringResult>(responseText, ["overallEvaluation", "goalEvaluations"]);
}

// 法令・制度検索（Grounding with Google Search）
const LEGAL_SEARCH_INSTRUCTION = `あなたは日本の福祉法制に精通した法令検索AIアシスタントです。
相談内容に関連する法令・制度を、Google検索によるグラウンディングを活用して正確に検索します。

対象法令の範囲：
- 生活保護法、生活困窮者自立支援法、障害者総合支援法、社会福祉法
- 児童福祉法、老人福祉法、介護保険法
- 大阪府関連の施行細則・条例
- 救護施設関連の厚生省令・ガイドライン
- その他、相談内容に関連する法令・通知・制度

回答は必ず以下のJSON形式で返してください：
{
  "references": [
    {
      "lawName": "法令名（例: 生活保護法）",
      "article": "条文番号と内容（例: 第4条（保護の補足性）利用し得る資産、能力その他あらゆるものを...）",
      "summary": "この条文が相談内容にどう関連するかの解説（100文字以内）",
      "sourceUrl": "出典URL（e-Gov法令検索等の公式URL。不明な場合は空文字）",
      "relevance": "相談内容との具体的な関連性の説明"
    }
  ],
  "legalBasis": "この相談に適用される法的根拠の総合説明（300文字以内）"
}

注意事項：
- 関連度の高い法令を最大5件まで提示
- 条文の引用は正確に。不確かな場合は「参照推奨」と明記
- 法改正の可能性があるため、最新の条文を確認するよう付記すること`;

export async function searchLegalInfo(
  query: string,
  consultationSummaries: string,
): Promise<AILegalSearchResult> {
  const userPrompt = `## 検索クエリ
${query}

## 相談記録の要約
${consultationSummaries || "（なし）"}

上記の相談内容に関連する法令・制度を検索し、条文と解説を提供してください。`;

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: LEGAL_SEARCH_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    console.error("GenAI empty legal search response", JSON.stringify({
      candidates: response.candidates?.length ?? 0,
    }));
    throw new Error("AI returned empty response for legal search");
  }

  // Grounding応答はマークダウンコードブロックやテキストを含む場合があるため、
  // コードブロック記法を除去してからJSONブロックを抽出
  const stripped = responseText.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, "$1").trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("GenAI legal search: no JSON found in response", responseText.slice(0, 500));
    throw new Error("AI response does not contain valid JSON for legal search");
  }

  const parsed = parseAIResponse<AILegalSearchResult>(jsonMatch[0], ["references", "legalBasis"]);

  // references配列の形状検証とsourceUrlサニタイズ
  if (!Array.isArray(parsed.references)) {
    throw new Error("AI response: references is not an array");
  }
  parsed.references = parsed.references
    .filter((ref): ref is LegalReference =>
      typeof ref === "object" &&
      ref !== null &&
      typeof ref.lawName === "string" &&
      typeof ref.article === "string" &&
      typeof ref.summary === "string" &&
      typeof ref.relevance === "string",
    )
    .map((ref) => ({
      ...ref,
      // XSS防止: https: スキームのURLのみ許可
      sourceUrl: typeof ref.sourceUrl === "string" && ref.sourceUrl.startsWith("https://")
        ? ref.sourceUrl
        : undefined,
    }));

  return parsed;
}
