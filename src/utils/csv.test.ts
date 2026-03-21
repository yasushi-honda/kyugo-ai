import { describe, it, expect } from "vitest";
import { toCsv } from "./csv.js";

describe("toCsv", () => {
  it("generates CSV with BOM and headers", () => {
    const columns = [
      { header: "名前", value: (r: { name: string }) => r.name },
      { header: "年齢", value: (r: { age: number }) => r.age },
    ];
    const rows = [{ name: "田中太郎", age: 30 }];
    const csv = toCsv(columns, rows);

    expect(csv).toContain("\uFEFF"); // BOM
    expect(csv).toContain("名前,年齢\r\n");
    expect(csv).toContain("田中太郎,30\r\n");
  });

  it("escapes cells with commas", () => {
    const columns = [{ header: "値", value: (r: { v: string }) => r.v }];
    const csv = toCsv(columns, [{ v: "a,b" }]);
    expect(csv).toContain('"a,b"');
  });

  it("escapes cells with double quotes", () => {
    const columns = [{ header: "値", value: (r: { v: string }) => r.v }];
    const csv = toCsv(columns, [{ v: 'say "hello"' }]);
    expect(csv).toContain('"say ""hello"""');
  });

  it("handles null and undefined", () => {
    const columns = [{ header: "値", value: () => null }];
    const csv = toCsv(columns, [{}]);
    expect(csv).toContain("値\r\n\r\n");
  });

  it("handles empty rows", () => {
    const columns = [{ header: "A", value: (r: { a: string }) => r.a }];
    const csv = toCsv(columns, []);
    expect(csv).toBe("\uFEFFA\r\n");
  });
});
