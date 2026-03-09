import { useState, useRef } from "react";
import { api } from "../api";
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

export function NewConsultationModal({ caseId, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("text");
  const [audioSource, setAudioSource] = useState<AudioSource>("record");
  // Fall back to file upload when browser doesn't support recording
  const [form, setForm] = useState({
    content: "",
    consultationType: "counter",
    context: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<{
    transcript?: string;
    summary?: string;
    suggestedSupports?: Array<{ menuName: string; reason: string; relevanceScore: number }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();
  const effectiveAudioSource = recorder.isSupported ? audioSource : "file";

  // Use recorded file or uploaded file
  const activeAudioFile = effectiveAudioSource === "record" ? recorder.recordedFile : audioFile;

  const handleSubmit = async () => {
    setSubmitting(true);
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
        setAiResult({
          transcript: result.transcript,
          summary: result.summary,
          suggestedSupports: result.suggestedSupports,
        });
      }
    } catch (err) {
      alert(`送信に失敗しました: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // AI結果表示後に閉じる
  if (aiResult) {
    return (
      <div className="modal-overlay" onClick={onCreated}>
        <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>AI分析結果</h3>
            <button className="btn btn-ghost" onClick={onCreated}>✕</button>
          </div>
          <div className="modal-body">
            {aiResult.transcript && (
              <div className="transcript-section">
                <label className="form-label">文字起こし</label>
                <div className="transcript-block">{aiResult.transcript}</div>
              </div>
            )}

            <div className="ai-panel">
              <div className="ai-panel-header">
                <div className="ai-panel-icon">AI</div>
                分析完了
              </div>
              {aiResult.summary && (
                <div className="ai-summary">{aiResult.summary}</div>
              )}
              {aiResult.suggestedSupports && aiResult.suggestedSupports.length > 0 && (
                <SuggestedSupports supports={aiResult.suggestedSupports} />
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onCreated}>閉じる</button>
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
                <option value="counter">窓口</option>
                <option value="visit">訪問</option>
                <option value="phone">電話</option>
                <option value="online">オンライン</option>
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
                    className={`audio-recorder ${audioFile ? "has-file" : ""}`}
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
                {mode === "audio" ? "AI分析中..." : "保存中..."}
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
