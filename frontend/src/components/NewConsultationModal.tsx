import { useState, useRef, useEffect, useCallback } from "react";
import { api, ApiError } from "../api";
import type { Consultation } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { SuggestedSupports } from "./SuggestedSupports";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { formatDuration } from "../constants";

interface Props {
  caseId: string;
  onClose: () => void;
  onCreated: () => void;
}

type Mode = "text" | "audio";
type AudioSource = "record" | "file";

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 60; // 5分間
const POLL_TIMEOUT_WARNING = 48; // 4分経過で警告

const CONSULTATION_TYPE_LABELS: Record<string, string> = {
  counter: "窓口 — 対面での相談",
  visit: "訪問 — 相談者宅等への訪問",
  phone: "電話 — 電話による相談",
  online: "オンライン — ビデオ通話等",
};

export function NewConsultationModal({ caseId, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("text");
  const [audioSource, setAudioSource] = useState<AudioSource>("record");
  const [form, setForm] = useState({
    content: "",
    consultationType: "counter",
    context: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [audioConsultation, setAudioConsultation] = useState<Consultation | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [pollError, setPollError] = useState(false);
  const [pollPermanentError, setPollPermanentError] = useState("");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();
  const effectiveAudioSource = recorder.isSupported ? audioSource : "file";

  const activeAudioFile = effectiveAudioSource === "record" ? recorder.recordedFile : audioFile;

  const pollStatus = useCallback(async (consultation: Consultation, attempt: number) => {
    if (attempt >= POLL_MAX_ATTEMPTS) return;
    try {
      const updated = await api.getConsultation(caseId, consultation.id!);
      setAudioConsultation(updated);
      setPollError(false);
      if (updated.aiStatus === "pending" || updated.aiStatus === "retrying" || updated.aiStatus === "retry_pending") {
        setPollCount(attempt + 1);
        pollTimerRef.current = setTimeout(() => pollStatus(updated, attempt + 1), POLL_INTERVAL_MS);
      }
    } catch (err) {
      // 恒久エラー（4xx、401除く）→ ポーリング停止+エラー表示
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 401) {
        setPollPermanentError("アクセスが拒否されました。画面を閉じてやり直してください。");
        return;
      }
      // 一時エラー（5xx/ネットワーク）→ 再試行継続
      setPollError(true);
      setPollCount(attempt + 1);
      pollTimerRef.current = setTimeout(() => pollStatus(consultation, attempt + 1), POLL_INTERVAL_MS);
    }
  }, [caseId]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (mode === "text") {
        await api.createConsultation(caseId, {
          content: form.content,
          consultationType: form.consultationType,
        });
        onCreated();
      } else if (activeAudioFile) {
        const formData = new FormData();
        formData.append("audio", activeAudioFile);
        formData.append("consultationType", form.consultationType);
        formData.append("context", form.context);

        const result = await api.createAudioConsultation(caseId, formData);
        setAudioConsultation(result);
        setPollCount(0);
        setPollError(false);
        setPollPermanentError("");
        pollTimerRef.current = setTimeout(() => pollStatus(result, 0), POLL_INTERVAL_MS);
      }
    } catch (err) {
      setError(`送信に失敗しました: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 音声相談結果表示
  if (audioConsultation) {
    const status = audioConsultation.aiStatus;
    const isAnalyzing = status === "pending" || status === "retrying";
    const isCompleted = status === "completed";
    const isError = status === "error";
    const isRetryPending = status === "retry_pending";

    return (
      <div className="modal-overlay" onClick={isAnalyzing ? undefined : onCreated}>
        <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isAnalyzing ? "AI分析中..." : isCompleted ? "AI分析結果" : "相談記録を保存しました"}</h3>
            <button className="btn btn-ghost" onClick={onCreated}>✕</button>
          </div>
          <div className="modal-body">
            {isAnalyzing && (
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <div className="spinner spinner-sm" />
                  AI分析を実行中です...（{pollCount * 5}秒経過）
                </div>
                <p className="ai-summary">音声の文字起こしと分析を行っています。このまましばらくお待ちください。画面を閉じても分析は継続されます。</p>
                {pollPermanentError && (
                  <p className="form-error">{pollPermanentError}</p>
                )}
                {pollError && !pollPermanentError && (
                  <p className="form-error">接続に問題があります。自動的に再試行しています。</p>
                )}
                {pollCount >= POLL_TIMEOUT_WARNING && (
                  <p className="form-help" style={{ color: "var(--kuri-500)" }}>
                    分析に時間がかかっています。画面を閉じて後で確認することもできます。
                  </p>
                )}
              </div>
            )}

            {isRetryPending && (
              <div className="ai-panel">
                <div className="ai-panel-header">
                  <div className="ai-panel-icon">⏳</div>
                  AI分析を再試行待ちです
                </div>
                <p className="ai-summary">一時的なエラーが発生しました。自動的に再試行されます。画面を閉じても問題ありません。</p>
              </div>
            )}

            {isError && (
              <div className="ai-panel ai-error-panel">
                <div className="ai-panel-header">
                  <div className="ai-panel-icon">⚠️</div>
                  AI分析に失敗しました
                </div>
                <p className="ai-summary">{audioConsultation.aiErrorMessage ?? "不明なエラー"}</p>
                <p className="ai-summary">相談記録は保存されています。管理者にお問い合わせください。</p>
              </div>
            )}

            {isCompleted && (
              <>
                {audioConsultation.transcript && (
                  <div className="transcript-section">
                    <label className="form-label">文字起こし</label>
                    <div className="transcript-block">{audioConsultation.transcript}</div>
                  </div>
                )}

                <div className="ai-panel">
                  <div className="ai-panel-header">
                    <div className="ai-panel-icon">AI</div>
                    分析完了
                  </div>
                  {audioConsultation.summary && (
                    <div className="ai-summary">{audioConsultation.summary}</div>
                  )}
                  {audioConsultation.suggestedSupports && audioConsultation.suggestedSupports.length > 0 && (
                    <SuggestedSupports supports={audioConsultation.suggestedSupports} />
                  )}
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onCreated}>
              {isAnalyzing ? "バックグラウンドで続行" : "閉じる"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新規相談記録</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              className={`btn ${mode === "text" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setMode("text"); recorder.reset(); setAudioFile(null); setAudioSource("record"); }}
            >
              テキスト入力
            </button>
            <button
              className={`btn ${mode === "audio" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("audio")}
            >
              音声
            </button>
          </div>

          <div className="form-row">
            <div className="form-group form-group-flex">
              <label className="form-label">職員</label>
              <input className="form-input" value={user?.email ?? ""} disabled />
            </div>
            <div className="form-group form-group-flex">
              <label className="form-label">相談種別</label>
              <select
                className="form-select"
                value={form.consultationType}
                onChange={(e) => setForm({ ...form, consultationType: e.target.value })}
              >
                {Object.entries(CONSULTATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {mode === "text" ? (
            <div className="form-group">
              <label className="form-label">相談内容 *</label>
              <textarea
                className="form-textarea"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="相談者の状況や相談内容を記録してください..."
                rows={6}
              />
              <p className="form-help">{form.content.length}文字</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">背景情報（任意）</label>
                <textarea
                  className="form-textarea"
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                  placeholder="相談の背景や事前情報があれば入力..."
                  rows={3}
                />
              </div>

              {/* Audio Source Toggle */}
              {recorder.isSupported && (
                <div className="form-group">
                  <label className="form-label">音声入力方法 *</label>
                  <div className="mode-toggle">
                    <button
                      className={`btn btn-sm ${effectiveAudioSource === "record" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => { setAudioSource("record"); setAudioFile(null); }}
                      type="button"
                    >
                      🎙️ 録音する
                    </button>
                    <button
                      className={`btn btn-sm ${effectiveAudioSource === "file" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => { setAudioSource("file"); if (recorder.isRecording || recorder.recordedFile) recorder.reset(); }}
                      type="button"
                    >
                      📁 ファイルを選択
                    </button>
                  </div>
                </div>
              )}

              {effectiveAudioSource === "record" ? (
                <div className="form-group">
                  <div className={`audio-recorder ${recorder.isRecording ? "is-recording" : ""} ${recorder.recordedFile ? "has-file" : ""}`}>
                    {recorder.error && (
                      <div className="audio-error">{recorder.error}</div>
                    )}

                    {!recorder.isRecording && !recorder.recordedFile && (
                      <>
                        <button className="btn btn-primary btn-record" onClick={recorder.start} type="button">
                          <span className="record-dot" />
                          録音開始
                        </button>
                        <div className="audio-label">
                          ボタンを押してマイクから録音を開始します
                        </div>
                      </>
                    )}

                    {recorder.isRecording && (
                      <>
                        <div className="recording-indicator">
                          <span className="recording-pulse" />
                          <span className="recording-time">{formatDuration(recorder.elapsedSeconds)}</span>
                        </div>
                        <div className="recording-actions">
                          {recorder.isPaused ? (
                            <button className="btn btn-secondary btn-sm" onClick={recorder.resume} type="button">
                              ▶ 再開
                            </button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={recorder.pause} type="button">
                              ⏸ 一時停止
                            </button>
                          )}
                          <button className="btn btn-primary btn-sm" onClick={recorder.stop} type="button">
                            ⏹ 録音停止
                          </button>
                        </div>
                      </>
                    )}

                    {!recorder.isRecording && recorder.recordedFile && (
                      <>
                        <div className="audio-icon">✅</div>
                        <div className="audio-label">録音が完了しました</div>
                        <div className="audio-filename">
                          {formatDuration(recorder.elapsedSeconds)} / {(recorder.recordedFile.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={recorder.reset} type="button">
                          やり直す
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: "none" }}
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className={`audio-recorder file-upload-area ${audioFile ? "has-file" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="audio-icon">{audioFile ? "✅" : "📁"}</div>
                    <div className="audio-label">
                      {audioFile
                        ? "ファイルが選択されています"
                        : "クリックして音声ファイルを選択"
                      }
                    </div>
                    {audioFile && (
                      <div className="audio-filename">
                        {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    )}
                    {!audioFile && (
                      <span className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-2)" }}>
                        ファイルを選ぶ
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={
              submitting ||
              (mode === "text" && !form.content) ||
              (mode === "audio" && !activeAudioFile)
            }
          >
            {submitting ? (
              <>
                <div className="spinner spinner-sm" />
                保存中...
              </>
            ) : (
              mode === "audio" ? "音声を分析・記録" : "相談を記録"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
