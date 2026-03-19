// Cloud Logging互換のJSON構造化ログ
// Cloud Runは stdout のJSON出力を自動的にCloud Loggingに取り込む
// severity フィールドでログレベルを認識する

interface LogEntry {
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function writeLog(severity: LogEntry["severity"], message: string, metadata?: Record<string, unknown>): void {
  const entry: LogEntry = {
    ...metadata,
    severity,
    message,
    timestamp: new Date().toISOString(),
  };
  const output = severity === "ERROR" ? process.stderr : process.stdout;
  output.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    writeLog("INFO", message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    writeLog("WARNING", message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>) {
    writeLog("ERROR", message, metadata);
  },
};
