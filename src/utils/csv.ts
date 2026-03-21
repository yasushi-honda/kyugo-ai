/**
 * CSVエクスポートユーティリティ
 * BOM付きUTF-8でExcel互換のCSVを生成する。
 */

const BOM = "\uFEFF";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // カンマ、改行、ダブルクォートを含む場合はクォート
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(","),
  );
  return BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}
