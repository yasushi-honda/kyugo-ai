import { upsertSupportMenu } from "../repositories/support-menu-repository.js";

const SUPPORT_MENUS = [
  {
    id: "seikatsu-hogo",
    name: "生活保護",
    category: "生活支援",
    eligibility: "資産・能力等を活用してもなお生活に困窮する方",
    description: "健康で文化的な最低限度の生活を保障し、自立を助長する制度。生活扶助、住宅扶助、医療扶助等を支給。",
    relatedLaws: ["生活保護法"],
  },
  {
    id: "seikatsu-konkyuu-jiritsushien",
    name: "生活困窮者自立支援制度",
    category: "生活支援",
    eligibility: "生活保護に至る前の段階で生活に困窮している方",
    description: "自立相談支援、住居確保給付金、就労準備支援、家計改善支援等を提供。",
    relatedLaws: ["生活困窮者自立支援法"],
  },
  {
    id: "juukyo-kakuho-kyuufukin",
    name: "住居確保給付金",
    category: "住居支援",
    eligibility: "離職等により住居を失った方または失うおそれのある方",
    description: "家賃相当額を一定期間支給し、住居の確保と就労自立を支援。",
    relatedLaws: ["生活困窮者自立支援法"],
  },
  {
    id: "shougai-nenkin",
    name: "障害年金",
    category: "障害支援",
    eligibility: "病気やけがで障害が残った方（初診日に年金加入）",
    description: "障害の程度に応じた年金を支給。障害基礎年金と障害厚生年金がある。",
    relatedLaws: ["国民年金法", "厚生年金保険法"],
  },
  {
    id: "shougaisha-sougou-shien",
    name: "障害者総合支援制度",
    category: "障害支援",
    eligibility: "身体障害、知的障害、精神障害、難病等のある方",
    description: "居宅介護、生活介護、就労継続支援等の障害福祉サービスを提供。",
    relatedLaws: ["障害者総合支援法"],
  },
  {
    id: "kodomo-shokuryou-shien",
    name: "子どもの学習・生活支援",
    category: "子育て支援",
    eligibility: "生活困窮世帯の子ども",
    description: "学習支援、生活習慣の改善、進路相談等を実施。貧困の連鎖を防止。",
    relatedLaws: ["生活困窮者自立支援法"],
  },
  {
    id: "boshi-fushi-kashitsuke",
    name: "母子父子寡婦福祉資金貸付",
    category: "子育て支援",
    eligibility: "母子家庭・父子家庭・寡婦の方",
    description: "修学資金、生活資金、住宅資金等の貸付を低利または無利子で実施。",
    relatedLaws: ["母子及び父子並びに寡婦福祉法"],
  },
  {
    id: "kaigo-hoken",
    name: "介護保険制度",
    category: "高齢者支援",
    eligibility: "65歳以上の方、40〜64歳の特定疾病の方",
    description: "訪問介護、通所介護、施設入所等の介護サービスを提供。",
    relatedLaws: ["介護保険法"],
  },
  {
    id: "seikatsu-fukushi-shikin",
    name: "生活福祉資金貸付制度",
    category: "生活支援",
    eligibility: "低所得世帯、障害者世帯、高齢者世帯",
    description: "総合支援資金、福祉資金、教育支援資金等を低利で貸付。社会福祉協議会が窓口。",
    relatedLaws: ["社会福祉法"],
  },
  {
    id: "shuurou-junbi-shien",
    name: "就労準備支援事業",
    category: "就労支援",
    eligibility: "直ちに一般就労が困難な生活困窮者",
    description: "日常生活自立・社会生活自立・就労自立の段階に応じた支援プログラムを提供。",
    relatedLaws: ["生活困窮者自立支援法"],
  },
];

async function main() {
  console.log("Seeding support menus...");
  for (const menu of SUPPORT_MENUS) {
    const { id, ...data } = menu;
    await upsertSupportMenu(id, data);
    console.log(`  ✓ ${menu.name}`);
  }
  console.log(`Done. ${SUPPORT_MENUS.length} menus seeded.`);
}

main().catch(console.error);
