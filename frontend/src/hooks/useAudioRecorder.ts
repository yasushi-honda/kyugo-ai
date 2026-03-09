import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  recordedFile: File | null;
  error: string | null;
}

export interface AudioRecorderActions {
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useAudioRecorder(): AudioRecorderState & AudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const isResettingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000;
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [clearTimer]);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setRecordedFile(null);
    isResettingRef.current = false;
    chunksRef.current = [];
    pausedElapsedRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (isResettingRef.current) {
          releaseStream();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `recording-${timestamp}.webm`, { type: "audio/webm" });
        setRecordedFile(file);
        releaseStream();
      };

      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      startTimer();
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"
        : "マイクの初期化に失敗しました。";
      setError(msg);
      releaseStream();
    }
  }, [releaseStream, startTimer]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearTimer();
    setIsRecording(false);
    setIsPaused(false);
  }, [clearTimer]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      clearTimer();
      pausedElapsedRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setIsPaused(true);
    }
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      setIsPaused(false);
    }
  }, [startTimer]);

  const reset = useCallback(() => {
    isResettingRef.current = true;
    stop();
    setRecordedFile(null);
    setElapsedSeconds(0);
    setError(null);
    pausedElapsedRef.current = 0;
    chunksRef.current = [];
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      releaseStream();
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        mr.ondataavailable = null;
        mr.onstop = null;
        mr.stop();
      }
    };
  }, [clearTimer, releaseStream]);

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    recordedFile,
    error,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}
