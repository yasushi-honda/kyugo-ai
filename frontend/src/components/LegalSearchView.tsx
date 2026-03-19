import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { LegalSearchResult } from "../api";
import { formatDateTime } from "../constants";

/** XSS防止: https: スキームのURLのみ許可 */
function isSafeUrl(url: string | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

interface LegalSearchViewProps {
  caseId: string;
}

export function LegalSearchView({ caseId }: LegalSearchViewProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LegalSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.listLegalSearches(caseId);
      setResults(data);
    } catch {
      setError("検索履歴の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await api.searchLegalInfo(caseId, query.trim());
      setResults((prev) => [result, ...prev]);
      setQuery("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="legal-search-view">
      {/* 検索フォーム */}
      <div className="legal-search-form">
        <div className="form-group">
          <label className="form-label" htmlFor="legalSearchQuery">法令・制度を検索</label>
          <textarea
            id="legalSearchQuery"
            className="form-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: 生活保護の申請条件"
            rows={2}
            disabled={searching}
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={searching || loading || !query.trim()}
        >
          {searching ? (
            <>
              <div className="spinner spinner-sm" />
              検索中...
            </>
          ) : (
            "関連法令を検索"
          )}
        </button>
      </div>

      {/* 検索結果一覧 */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">支援方法や給付制度の条件を法令から調べられます</p>
          <p>上のフォームにキーワードを入力して検索してください。</p>
        </div>
      ) : (
        <div className="legal-search-results">
          {results.map((result) => (
            <div key={result.id} className="legal-search-card">
              <div className="legal-search-card-header">
                <div className="legal-search-query">
                  <span className="legal-search-label">検索:</span> {result.query}
                </div>
                <div className="legal-search-date">
                  {formatDateTime(result.createdAt)}
                </div>
              </div>

              {/* 法的根拠の総合説明 */}
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <div className="ai-panel-icon">AI</div>
                  法的根拠
                </div>
                <div className="ai-summary">{result.legalBasis}</div>
              </div>

              {/* 関連法令リスト */}
              <div className="legal-references">
                {result.references.map((ref, i) => (
                  <div key={`${result.id}-${ref.lawName}-${i}`} className="legal-reference-card">
                    <div className="legal-reference-header">
                      <h4 className="legal-reference-name">{ref.lawName}</h4>
                      {isSafeUrl(ref.sourceUrl) && (
                        <a
                          href={ref.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="legal-reference-link"
                        >
                          出典
                        </a>
                      )}
                    </div>
                    <div className="legal-reference-article">{ref.article}</div>
                    <div className="legal-reference-summary">{ref.summary}</div>
                    <div className="legal-relevance-badge">
                      {ref.relevance}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
