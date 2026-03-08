import { getScoreClass } from "../constants";

interface SupportItem {
  menuName: string;
  reason: string;
  relevanceScore: number;
}

export function SuggestedSupports({ supports }: { supports: SupportItem[] }) {
  if (supports.length === 0) return null;

  return (
    <div>
      <div className="ai-section-label">提案された支援メニュー</div>
      {supports.map((s, i) => (
        <div key={i} className="support-suggestion">
          <div className={`support-score ${getScoreClass(s.relevanceScore)}`}>
            {Math.round(s.relevanceScore * 100)}
          </div>
          <div>
            <div className="support-name">{s.menuName}</div>
            <div className="support-reason">{s.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
