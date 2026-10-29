// shared/csv.ts
// Small dependency-free CSV parser (client- and server-safe).
// Supports: UTF-8 BOM, "," ";" and TAB delimiters (auto-detected), quoted
// fields with "" escapes and line breaks inside quotes, CRLF / LF / CR.

export type CsvDelimiter = "," | ";" | "\t";

export type CsvRecord = {
  /** 1-based line of the file where this record starts (header = line 1). */
  line: number;
  cells: string[];
};

export type CsvParseResult = {
  delimiter: CsvDelimiter;
  records: CsvRecord[];
  /** True when a quoted field was never closed (the rest of the file was swallowed). */
  unterminatedQuote: boolean;
};

const DELIMITERS: CsvDelimiter[] = [",", ";", "\t"];

/** Picks the delimiter that appears most (outside quotes) on the first non-empty line. */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  let seenContent = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      seenContent = true;
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (seenContent) break;
      continue;
    }

    if (ch.trim() !== "" || ch === "\t") seenContent = true;
    if (!inQuotes && ch in counts) counts[ch] += 1;
  }

  let best: CsvDelimiter = ",";
  for (const d of DELIMITERS) {
    if (counts[d] > counts[best]) best = d;
  }
  return best;
}

export function parseCsv(
  input: string,
  options: { delimiter?: CsvDelimiter } = {},
): CsvParseResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = options.delimiter ?? detectDelimiter(text);

  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;
  let line = 1;
  let recordLine = 1;
  let unterminatedQuote = false;

  const endField = () => {
    cells.push(field);
    field = "";
    fieldWasQuoted = false;
  };

  const endRecord = () => {
    endField();
    // Skip blank lines and lines where every cell is empty (",,,").
    if (cells.some((c) => c.trim() !== "")) {
      records.push({ line: recordLine, cells });
    }
    cells = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\r") {
          if (text[i + 1] === "\n") i += 1;
          line += 1;
          field += "\n";
        } else {
          if (ch === "\n") line += 1;
          field += ch;
        }
      }
      continue;
    }

    if (ch === '"' && field === "" && !fieldWasQuoted) {
      inQuotes = true;
      fieldWasQuoted = true;
      continue;
    }

    if (ch === delimiter) {
      endField();
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      endRecord();
      line += 1;
      recordLine = line;
      continue;
    }

    field += ch;
  }

  if (inQuotes) unterminatedQuote = true;
  if (field !== "" || cells.length > 0 || fieldWasQuoted) endRecord();

  return { delimiter, records, unterminatedQuote };
}

/** Serialises rows to CSV text; quotes every field that needs it. */
export function toCsv(
  rows: string[][],
  delimiter: CsvDelimiter = ";",
  eol = "\r\n",
): string {
  const esc = (v: string) =>
    v.includes(delimiter) || /["\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(esc).join(delimiter)).join(eol) + eol;
}
