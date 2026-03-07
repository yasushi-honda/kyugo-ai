#!/bin/bash
# Firestore REST API で staffId バグにより不正なデータを修正
# Usage: bash src/scripts/fix-staffid-data.sh
#
# PR#10以前に音声モードで作成された相談レコードの staffId が
# Firebase UID になっている問題を修正する (Issue #12)

set -euo pipefail

PROJECT_ID="kyugo-ai-dev"
TOKEN=$(gcloud auth print-access-token --configuration=kyugo-ai)
BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

# 修正対象: Firebase UID → Firestore staffId
WRONG_STAFF_ID="qIq2SX5eNoVXXv01Q60yYp3Zpj03"
CORRECT_STAFF_ID="GL24XzLgXeaVO3xS1V07"
CASE_ID="ak5wr6uIf0soDkzwsrJa"

echo "=== staffId データ修正スクリプト ==="
echo "対象ケース: ${CASE_ID}"
echo "修正: ${WRONG_STAFF_ID} → ${CORRECT_STAFF_ID}"
echo ""

# 1. 対象ケースのサブコレクション consultations から不正レコードを検索
# Firestoreパス: cases/{caseId}/consultations
echo "--- 相談レコードを検索中 (cases/${CASE_ID}/consultations) ---"
QUERY_RESULT=$(curl -s -X POST \
  "${BASE_URL}/cases/${CASE_ID}:runQuery" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"structuredQuery\": {
      \"from\": [{\"collectionId\": \"consultations\"}],
      \"where\": {
        \"fieldFilter\": {
          \"field\": {\"fieldPath\": \"staffId\"},
          \"op\": \"EQUAL\",
          \"value\": {\"stringValue\": \"${WRONG_STAFF_ID}\"}
        }
      }
    }
  }")

# ドキュメント名を抽出
DOC_NAMES=$(echo "${QUERY_RESULT}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    doc = item.get('document', {})
    name = doc.get('name', '')
    if name:
        print(name)
")

if [ -z "${DOC_NAMES}" ]; then
  echo "修正対象のレコードが見つかりません。既に修正済みの可能性があります。"
  exit 0
fi

echo "修正対象:"
echo "${DOC_NAMES}"
echo ""

# 2. 各レコードの staffId を更新
while IFS= read -r DOC_NAME; do
  echo "更新中: ${DOC_NAME}"
  RESPONSE=$(curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/${DOC_NAME}?updateMask.fieldPaths=staffId" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"fields\": {
        \"staffId\": {\"stringValue\": \"${CORRECT_STAFF_ID}\"}
      }
    }")

  # 成功確認
  UPDATED_STAFF=$(echo "${RESPONSE}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('fields', {}).get('staffId', {}).get('stringValue', 'ERROR'))
" 2>/dev/null || echo "ERROR")

  if [ "${UPDATED_STAFF}" = "${CORRECT_STAFF_ID}" ]; then
    echo "  -> 成功: staffId = ${CORRECT_STAFF_ID}"
  else
    echo "  -> 失敗: ${RESPONSE}"
    exit 1
  fi
done <<< "${DOC_NAMES}"

echo ""
echo "=== 修正完了 ==="
