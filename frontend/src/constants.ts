export const STATUS_LABELS: Record<string, string> = {
  active: "対応中",
  referred: "照会中",
  closed: "終了",
};

export const TYPE_LABELS: Record<string, string> = {
  visit: "訪問",
  counter: "窓口",
  phone: "電話",
  online: "オンライン",
};

type FirestoreTimestamp = { _seconds: number };

export function formatDate(ts: FirestoreTimestamp): string {
  return new Date(ts._seconds * 1000).toLocaleDateString("ja-JP");
}

export function formatDateTime(ts: FirestoreTimestamp): string {
  const d = new Date(ts._seconds * 1000);
  return d.toLocaleDateString("ja-JP") + " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function getScoreClass(score: number): string {
  if (score >= 0.8) return "score-high";
  if (score >= 0.5) return "score-mid";
  return "score-low";
}
