#!/bin/bash
# Firestore REST API でシードデータ投入
# Usage: bash src/scripts/seed-support-menus-rest.sh

set -euo pipefail

PROJECT_ID="kyugo-ai-dev"
TOKEN=$(gcloud auth print-access-token --configuration=kyugo-ai)
BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

function upsert_menu() {
  local ID=$1
  local NAME=$2
  local CATEGORY=$3
  local ELIGIBILITY=$4
  local DESCRIPTION=$5
  shift 5
  local LAWS=("$@")

  # Build relatedLaws array
  local LAWS_JSON=""
  for law in "${LAWS[@]}"; do
    if [ -n "$LAWS_JSON" ]; then LAWS_JSON+=","; fi
    LAWS_JSON+="{\"stringValue\":\"${law}\"}"
  done

  local NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  curl -s -X PATCH \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}/supportMenus/${ID}" \
    -d "{
      \"fields\": {
        \"name\": {\"stringValue\": \"${NAME}\"},
        \"category\": {\"stringValue\": \"${CATEGORY}\"},
        \"eligibility\": {\"stringValue\": \"${ELIGIBILITY}\"},
        \"description\": {\"stringValue\": \"${DESCRIPTION}\"},
        \"relatedLaws\": {\"arrayValue\": {\"values\": [${LAWS_JSON}]}},
        \"updatedAt\": {\"timestampValue\": \"${NOW}\"}
      }
    }" > /dev/null

  echo "  ✓ ${NAME}"
}

echo "Seeding support menus via REST API..."

upsert_menu "seikatsu-hogo" "生活保護" "生活支援" \
  "資産・能力等を活用してもなお生活に困窮する方" \
  "健康で文化的な最低限度の生活を保障し、自立を助長する制度。生活扶助、住宅扶助、医療扶助等を支給。" \
  "生活保護法"

upsert_menu "seikatsu-konkyuu-jiritsushien" "生活困窮者自立支援制度" "生活支援" \
  "生活保護に至る前の段階で生活に困窮している方" \
  "自立相談支援、住居確保給付金、就労準備支援、家計改善支援等を提供。" \
  "生活困窮者自立支援法"

upsert_menu "juukyo-kakuho-kyuufukin" "住居確保給付金" "住居支援" \
  "離職等により住居を失った方または失うおそれのある方" \
  "家賃相当額を一定期間支給し、住居の確保と就労自立を支援。" \
  "生活困窮者自立支援法"

upsert_menu "shougai-nenkin" "障害年金" "障害支援" \
  "病気やけがで障害が残った方（初診日に年金加入）" \
  "障害の程度に応じた年金を支給。障害基礎年金と障害厚生年金がある。" \
  "国民年金法" "厚生年金保険法"

upsert_menu "shougaisha-sougou-shien" "障害者総合支援制度" "障害支援" \
  "身体障害、知的障害、精神障害、難病等のある方" \
  "居宅介護、生活介護、就労継続支援等の障害福祉サービスを提供。" \
  "障害者総合支援法"

upsert_menu "kodomo-shokuryou-shien" "子どもの学習・生活支援" "子育て支援" \
  "生活困窮世帯の子ども" \
  "学習支援、生活習慣の改善、進路相談等を実施。貧困の連鎖を防止。" \
  "生活困窮者自立支援法"

upsert_menu "boshi-fushi-kashitsuke" "母子父子寡婦福祉資金貸付" "子育て支援" \
  "母子家庭・父子家庭・寡婦の方" \
  "修学資金、生活資金、住宅資金等の貸付を低利または無利子で実施。" \
  "母子及び父子並びに寡婦福祉法"

upsert_menu "kaigo-hoken" "介護保険制度" "高齢者支援" \
  "65歳以上の方、40〜64歳の特定疾病の方" \
  "訪問介護、通所介護、施設入所等の介護サービスを提供。" \
  "介護保険法"

upsert_menu "seikatsu-fukushi-shikin" "生活福祉資金貸付制度" "生活支援" \
  "低所得世帯、障害者世帯、高齢者世帯" \
  "総合支援資金、福祉資金、教育支援資金等を低利で貸付。社会福祉協議会が窓口。" \
  "社会福祉法"

upsert_menu "shuurou-junbi-shien" "就労準備支援事業" "就労支援" \
  "直ちに一般就労が困難な生活困窮者" \
  "日常生活自立・社会生活自立・就労自立の段階に応じた支援プログラムを提供。" \
  "生活困窮者自立支援法"

echo "Done. 10 menus seeded."
