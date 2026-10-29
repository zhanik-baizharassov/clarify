import { describe, it, expect } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "./csv";
import {
  PLACES_IMPORT_TEMPLATE_CSV,
  canonicalColumn,
  parseImportFile,
} from "./places-import-template";

const cells = (text: string) => parseCsv(text).records.map((r) => r.cells);

describe("parseCsv", () => {
  it("parses simple comma CSV with LF and CRLF", () => {
    expect(cells("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(cells("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("detects semicolon and tab delimiters", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(detectDelimiter('"a,b,c";d')).toBe(";");
    expect(cells("a;b\n1,5;2")).toEqual([["a", "b"], ["1,5", "2"]]);
  });

  it("strips a UTF-8 BOM", () => {
    expect(cells("﻿name,city\nx,y")[0]).toEqual(["name", "city"]);
  });

  it("handles quotes, escaped quotes and newlines inside quotes", () => {
    const r = parseCsv('a,b\n"x, ""y""","line1\nline2"\nz,w');
    expect(r.records[1].cells).toEqual(['x, "y"', "line1\nline2"]);
    expect(r.records[2].line).toBe(4);
    expect(r.unterminatedQuote).toBe(false);
  });

  it("skips empty lines and rows with only empty cells, keeps line numbers", () => {
    const r = parseCsv("a,b\n\n1,2\n,\n3,4");
    expect(r.records.map((x) => x.line)).toEqual([1, 3, 5]);
  });

  it("keeps ragged rows as they are", () => {
    expect(cells("a,b,c\n1,2\n1,2,3,4")).toEqual([
      ["a", "b", "c"],
      ["1", "2"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("flags an unterminated quote", () => {
    expect(parseCsv('a,b\n"x,y').unterminatedQuote).toBe(true);
  });

  it("keeps a trailing empty field", () => {
    expect(cells("a,b\n1,")).toEqual([["a", "b"], ["1", ""]]);
  });

  it("round-trips through toCsv", () => {
    const rows = [["a;b", 'q"q', "x\ny"], ["1", "2", "3"]];
    expect(cells(toCsv(rows, ";"))).toEqual(rows);
  });
});

describe("parseImportFile", () => {
  it("accepts the template", () => {
    const r = parseImportFile(PLACES_IMPORT_TEMPLATE_CSV);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(2);
      expect(r.rows[0].data.name).toBe("Кофейня «Пример»");
      expect(r.rows[0].data.work_hours).toBe("Пн–Пт 09:00–21:00 • Сб–Вс 10:00–18:00");
      expect(r.rows[0].line).toBe(2);
    }
  });

  it("maps Russian header aliases", () => {
    expect(canonicalColumn("Название")).toBe("name");
    expect(canonicalColumn("часы работы")).toBe("work_hours");
    expect(canonicalColumn("Часы_работы")).toBe("work_hours");
    expect(canonicalColumn("широта")).toBe("lat");
    expect(canonicalColumn("whatever")).toBeNull();
  });

  it("reports missing required columns", () => {
    const r = parseImportFile("name,city\nx,y");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("category");
  });

  it("marks rows with too many values as local errors", () => {
    const r = parseImportFile("name,category,city,address\na,b,c,d,e\nf,g,h,i");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.localErrors.map((x) => x.line)).toEqual([2]);
      expect(r.rows).toHaveLength(1);
    }
  });

  it("rejects an empty file", () => {
    expect(parseImportFile("").ok).toBe(false);
  });
});
