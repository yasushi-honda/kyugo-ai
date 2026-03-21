/**
 * デモデータ投入スクリプト
 *
 * 使用方法:
 *   npx tsx src/scripts/seed-demo-data.ts <staffId>
 *
 * staffIdは本番のstaffコレクションに存在する職員IDを指定する。
 * ログイン後、/api/me で確認可能。
 */
import { Timestamp } from "@google-cloud/firestore";
import { firestore } from "../config.js";

const staffId = process.argv[2];
if (!staffId) {
  console.error("Usage: npx tsx src/scripts/seed-demo-data.ts <staffId>");
  console.error("  staffId: 本番のstaffコレクションに存在する職員ID");
  process.exit(1);
}

const now = Timestamp.now();

// ケース1: 佐藤 美咲（AI分析済み + 支援計画書あり）
const case1Ref = firestore.collection("cases").doc("demo-case-001");
const case1Data = {
  clientName: "佐藤 美咲",
  clientId: "D-2026-001",
  dateOfBirth: Timestamp.fromDate(new Date("1958-07-22")),
  householdInfo: {},
  incomeInfo: {},
  status: "active",
  assignedStaffId: staffId,
  createdAt: Timestamp.fromDate(new Date("2026-03-18T09:00:00Z")),
  updatedAt: now,
};

const consultation1Data = {
  caseId: "demo-case-001",
  staffId,
  content: "訪問相談。佐藤さん（67歳）は月8万円の年金で一人暮らし。最近、医療費の自己負担が重く、通院が困難になっている。食費も切り詰めており、栄養状態が心配。近隣に頼れる親族はいない。高血圧と糖尿病の治療を続けているが、薬代の負担も大きい。介護保険の申請はまだ行っていないが、日常生活に不安を感じ始めている。",
  transcript: "",
  summary: "一人暮らしの高齢者が月8万円の年金で生活しており、医療費の自己負担が重く通院が困難になっている状態。経済的な困窮と医療アクセスへの課題を抱えている。",
  suggestedSupports: [
    { menuId: "seikatsu-hogo", menuName: "生活保護", reason: "年金収入が生活保護基準を下回っており、医療扶助により医療費の自己負担がなくなります。", relevanceScore: 0.95 },
    { menuId: "seikatsu-konkyuu-jiritsushien", menuName: "生活困窮者自立支援制度", reason: "生活保護に至る前の段階で、家計改善支援や就労支援等の包括的な支援を受けられます。", relevanceScore: 0.88 },
    { menuId: "kogaku-ryouyouhi", menuName: "高額療養費制度", reason: "医療費の自己負担が高額になった場合、限度額を超えた分が払い戻されます。", relevanceScore: 0.72 },
  ],
  consultationType: "visit",
  aiStatus: "completed",
  createdAt: Timestamp.fromDate(new Date("2026-03-18T09:30:00Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-03-18T09:31:00Z")),
};

const supportPlan1Data = {
  caseId: "demo-case-001",
  status: "draft",
  overallPolicy: "医療アクセスの確保と経済的安定を最優先に支援する。まず高額療養費制度の申請を支援し、並行して生活保護の申請を検討する。",
  goals: [
    { goal: "医療費負担の軽減", targetDate: "2026-04-30", supportMenus: ["高額療養費制度", "生活保護（医療扶助）"], status: "not_started" },
    { goal: "安定した生活基盤の構築", targetDate: "2026-06-30", supportMenus: ["生活保護", "生活困窮者自立支援制度"], status: "not_started" },
  ],
  specialNotes: "独居高齢者のため、定期的な訪問による見守りも併せて実施する。",
  planStartDate: "2026-04-01",
  nextReviewDate: "2026-05-01",
  createdBy: staffId,
  createdAt: Timestamp.fromDate(new Date("2026-03-18T10:00:00Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-03-18T10:00:00Z")),
};

// ケース2: 田中 健一（複数相談記録）
const case2Ref = firestore.collection("cases").doc("demo-case-002");
const case2Data = {
  clientName: "田中 健一",
  clientId: "D-2026-002",
  dateOfBirth: Timestamp.fromDate(new Date("1975-03-10")),
  householdInfo: {},
  incomeInfo: {},
  status: "active",
  assignedStaffId: staffId,
  createdAt: Timestamp.fromDate(new Date("2026-03-15T10:00:00Z")),
  updatedAt: now,
};

const consultation2aData = {
  caseId: "demo-case-002",
  staffId,
  content: "窓口相談。田中さん（51歳）が生活困窮の相談で来庁。半年前にリストラされ、雇用保険を受給していたが先月で終了。妻と中学生の子供1人の3人家族。妻はパートタイムで月10万円程度の収入がある。住宅ローンの返済が滞り始めている。ハローワークで求職活動中だが、前職と同等の条件の仕事が見つからない。",
  transcript: "",
  summary: "51歳男性が半年前のリストラ後、雇用保険終了で生活困窮。妻のパート収入のみで3人家族を支えている状況。住宅ローン滞納が始まっており、再就職も難航。",
  suggestedSupports: [
    { menuId: "juukyo-kakuho-kyuufukin", menuName: "住居確保給付金", reason: "離職により住宅ローンの返済が困難になっており、住居喪失のおそれがあります。", relevanceScore: 0.92 },
    { menuId: "seikatsu-konkyuu-jiritsushien", menuName: "生活困窮者自立支援制度", reason: "就労準備支援や家計改善支援により、自立に向けた包括的なサポートを受けられます。", relevanceScore: 0.85 },
  ],
  consultationType: "counter",
  aiStatus: "completed",
  createdAt: Timestamp.fromDate(new Date("2026-03-15T10:30:00Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-03-15T10:31:00Z")),
};

const consultation2bData = {
  caseId: "demo-case-002",
  staffId,
  content: "電話フォロー。前回の相談後、住居確保給付金の申請を案内。申請書類の準備状況を確認したところ、収入証明書の取得に時間がかかっているとのこと。来週中に書類が揃い次第、窓口に来庁予定。精神的には少し落ち着いている様子。就職活動については介護職への転職を検討中。",
  transcript: "",
  summary: "住居確保給付金の申請手続きを進行中。収入証明書の取得待ち。精神面は安定しつつあり、介護職への転職を前向きに検討。",
  suggestedSupports: [
    { menuId: "juukyo-kakuho-kyuufukin", menuName: "住居確保給付金", reason: "申請手続きが進行中であり、引き続き支援が必要。", relevanceScore: 0.90 },
  ],
  consultationType: "phone",
  aiStatus: "completed",
  createdAt: Timestamp.fromDate(new Date("2026-03-19T14:00:00Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-03-19T14:01:00Z")),
};

async function seed() {
  console.log(`デモデータ投入開始（staffId: ${staffId}）`);

  // ケース1
  await case1Ref.set(case1Data);
  console.log("✅ ケース1: 佐藤 美咲 作成");

  const cons1Ref = case1Ref.collection("consultations").doc("demo-cons-001");
  await cons1Ref.set(consultation1Data);
  console.log("✅ ケース1: 相談記録（AI分析済み）作成");

  const plan1Ref = case1Ref.collection("supportPlans").doc("demo-plan-001");
  await plan1Ref.set(supportPlan1Data);
  console.log("✅ ケース1: 支援計画書（下書き）作成");

  // ケース2
  await case2Ref.set(case2Data);
  console.log("✅ ケース2: 田中 健一 作成");

  const cons2aRef = case2Ref.collection("consultations").doc("demo-cons-002a");
  await cons2aRef.set(consultation2aData);
  console.log("✅ ケース2: 相談記録1（窓口相談）作成");

  const cons2bRef = case2Ref.collection("consultations").doc("demo-cons-002b");
  await cons2bRef.set(consultation2bData);
  console.log("✅ ケース2: 相談記録2（電話フォロー）作成");

  console.log("\n🎉 デモデータ投入完了！");
  console.log("確認: https://kyugo-ai-2knyenyska-an.a.run.app/ にログインしてダッシュボードを確認");
}

seed().catch((err) => {
  console.error("❌ デモデータ投入失敗:", err);
  process.exit(1);
});
