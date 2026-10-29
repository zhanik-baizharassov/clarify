"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { toCsv } from "@/shared/csv";
import {
  IMPORT_MAX_ROWS_PER_REQUEST,
  PLACES_IMPORT_TEMPLATE_CSV,
  parseImportFile,
  type ImportRequestRow,
} from "@/shared/places-import-template";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const PREVIEW_ROWS = 50;

type RowStatus = "pending" | "valid" | "invalid" | "duplicate" | "created";

type RowState = {
  line: number;
  name: string;
  city: string;
  address: string;
  status: RowStatus;
  error?: string;
  /** Row is broken locally and is never sent to the server. */
  local?: boolean;
};

type ApiResult = {
  row: number;
  status: "created" | "duplicate" | "invalid";
  error?: string;
};

type Phase = "idle" | "checking" | "ready" | "importing" | "done";

const STATUS_LABEL: Record<RowStatus, string> = {
  pending: "Не проверена",
  valid: "Готова к импорту",
  invalid: "Ошибка",
  duplicate: "Дубликат",
  created: "Создана",
};

function StatusIcon({ status }: { status: RowStatus }) {
  const cls = "h-4 w-4 shrink-0";
  switch (status) {
    case "valid":
    case "created":
      return <CheckCircle2 aria-hidden className={`${cls} text-primary`} />;
    case "invalid":
      return <XCircle aria-hidden className={`${cls} text-destructive`} />;
    case "duplicate":
      return <Copy aria-hidden className={`${cls} text-muted-foreground`} />;
    default:
      return <MinusCircle aria-hidden className={`${cls} text-muted-foreground`} />;
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ImportPlacesPanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [sendRows, setSendRows] = useState<ImportRequestRow[]>([]);
  const [ignoredHeaders, setIgnoredHeaders] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [onlyValid, setOnlyValid] = useState(false);

  const busy = phase === "checking" || phase === "importing";

  const counts = useMemo(() => {
    const c = { valid: 0, invalid: 0, duplicate: 0, created: 0, pending: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  function applyResults(results: ApiResult[], dryRun: boolean) {
    const byLine = new Map(results.map((r) => [r.row, r]));
    setRows((prev) =>
      prev.map((row) => {
        const r = byLine.get(row.line);
        if (!r || row.local) return row;
        if (r.status === "created") {
          return { ...row, status: dryRun ? "valid" : "created", error: undefined };
        }
        return { ...row, status: r.status, error: r.error };
      }),
    );
  }

  /** Sends rows to the API in chunks; stops (keeping progress) on a request failure. */
  async function runChunks(toSend: ImportRequestRow[], dryRun: boolean) {
    setProgress({ done: 0, total: toSend.length });
    for (let i = 0; i < toSend.length; i += IMPORT_MAX_ROWS_PER_REQUEST) {
      const chunk = toSend.slice(i, i + IMPORT_MAX_ROWS_PER_REQUEST);
      let res: Response;
      try {
        res = await fetch("/api/admin/places/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, dryRun }),
        });
      } catch {
        throw new Error("Нет связи с сервером. Проверьте интернет и повторите.");
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось обработать файл");
      }

      applyResults(data.results as ApiResult[], dryRun);
      setProgress({ done: i + chunk.length, total: toSend.length });
    }
  }

  async function checkRows(toCheck: ImportRequestRow[]) {
    setPhase("checking");
    setErr(null);
    try {
      await runChunks(toCheck, true);
      setPhase("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка проверки");
      setPhase("idle");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    // Allow picking the same file again (e.g. after fixing it).
    input.value = "";
    if (!file) return;

    setErr(null);
    setRows([]);
    setSendRows([]);
    setIgnoredHeaders([]);
    setOnlyValid(false);
    setFileName(file.name);
    setPhase("idle");

    if (file.size > MAX_FILE_BYTES) {
      setErr("Файл больше 5 МБ. Разделите его на несколько файлов.");
      return;
    }

    const parsed = parseImportFile(await file.text());
    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }

    if (parsed.rows.length + parsed.localErrors.length === 0) {
      setErr("В файле нет строк с данными.");
      return;
    }
    if (parsed.rows.length + parsed.localErrors.length > MAX_ROWS) {
      setErr(
        `В файле больше ${MAX_ROWS} строк. Разделите его на несколько файлов.`,
      );
      return;
    }

    const all: RowState[] = [
      ...parsed.rows.map((r) => ({
        line: r.line,
        name: r.data.name ?? "",
        city: r.data.city ?? "",
        address: r.data.address ?? "",
        status: "pending" as RowStatus,
      })),
      ...parsed.localErrors.map((r) => ({
        line: r.line,
        name: "",
        city: "",
        address: "",
        status: "invalid" as RowStatus,
        error: r.error,
        local: true,
      })),
    ].sort((a, b) => a.line - b.line);

    setRows(all);
    setSendRows(parsed.rows);
    setIgnoredHeaders(parsed.ignoredHeaders);

    if (parsed.rows.length > 0) await checkRows(parsed.rows);
    else setPhase("ready");
  }

  async function onImport() {
    const validLines = new Set(
      rows.filter((x) => x.status === "valid").map((x) => x.line),
    );
    const toSend = sendRows.filter((r) => validLines.has(r.line));
    if (toSend.length === 0) return;

    setPhase("importing");
    setErr(null);
    try {
      await runChunks(toSend, false);
      setPhase("done");
    } catch (e) {
      setErr(
        `${(e instanceof Error ? e.message : "Ошибка импорта").replace(/\.?$/, ".")} Уже созданные карточки сохранены; нажмите «Импортировать», чтобы продолжить с оставшихся строк.`,
      );
      setPhase("ready");
    }
  }

  function downloadErrorReport() {
    const report: string[][] = [["row", "error"]];
    for (const r of rows) {
      if (r.status === "invalid" || r.status === "duplicate") {
        report.push([String(r.line), r.error ?? STATUS_LABEL[r.status]]);
      }
    }
    downloadText("places-import-errors.csv", "﻿" + toCsv(report, ";"));
  }

  const hasProblems = counts.invalid > 0;
  const canImport =
    phase === "ready" &&
    counts.valid > 0 &&
    (!hasProblems || onlyValid);
  const reportCount = counts.invalid + counts.duplicate;
  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Массовая загрузка{" "}
        <span className="font-medium text-foreground">каталожных карточек</span>{" "}
        из CSV-файла (без привязки к компании). Сначала файл проверяется, и
        только потом создаются карточки. Одинаковые карточки (город + адрес +
        название) пропускаются.
      </div>

      <section className="rounded-2xl border bg-background p-5">
        <div className="mb-4">
          <div className="text-base font-semibold">1. Файл</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Обязательные столбцы: name, category, city, address. По желанию:
            phone, description, website, work_hours, lat, lng (допустимы и
            русские заголовки). Разделитель «,» или «;», кодировка UTF-8.
            Категория — название или slug существующей категории.
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">CSV-файл</span>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={onFile}
              className="block h-11 max-w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:opacity-60"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              downloadText("places-import-template.csv", PLACES_IMPORT_TEMPLATE_CSV)
            }
            className="clarify-button-secondary-sm inline-flex items-center gap-2"
          >
            <Download aria-hidden className="h-4 w-4" />
            Скачать шаблон CSV
          </button>
        </div>

        {fileName ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Выбран файл:{" "}
            <span className="font-medium text-foreground">{fileName}</span>
          </div>
        ) : null}

        {ignoredHeaders.length > 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Неизвестные столбцы будут проигнорированы:{" "}
            {ignoredHeaders.join(", ")}
          </div>
        ) : null}
      </section>

      <div aria-live="polite" className="grid gap-3">
        {err ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {err}
          </div>
        ) : null}

        {busy ? (
          <div className="rounded-xl border bg-muted/20 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              <span>
                {phase === "checking" ? "Проверка файла" : "Импорт"}:{" "}
                {progress.done} из {progress.total} ({percent}%)
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={phase === "checking" ? "Проверка файла" : "Импорт"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
            Импорт завершён. Создано: {counts.created}
            {counts.duplicate > 0 ? `, дубликатов пропущено: ${counts.duplicate}` : ""}
            {counts.invalid > 0 ? `, с ошибками: ${counts.invalid}` : ""}
            {counts.valid > 0 ? `, не обработано: ${counts.valid}` : ""}.
          </div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <section className="rounded-2xl border bg-background p-5">
          <div className="mb-4">
            <div className="text-base font-semibold">2. Проверка</div>
            <div
              className="mt-2 flex flex-wrap gap-2 text-xs"
              aria-live="polite"
            >
              <span className="rounded-full border bg-muted/20 px-3 py-1">
                Всего строк:{" "}
                <span className="font-medium text-foreground">{rows.length}</span>
              </span>
              <span className="rounded-full border bg-muted/20 px-3 py-1">
                {phase === "done" ? "Создано" : "Готовы"}:{" "}
                <span className="font-medium text-foreground">
                  {phase === "done" ? counts.created : counts.valid}
                </span>
              </span>
              <span className="rounded-full border bg-muted/20 px-3 py-1">
                С ошибками:{" "}
                <span className="font-medium text-foreground">{counts.invalid}</span>
              </span>
              <span className="rounded-full border bg-muted/20 px-3 py-1">
                Дубликаты:{" "}
                <span className="font-medium text-foreground">{counts.duplicate}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">
                Предварительный просмотр первых {PREVIEW_ROWS} строк файла
              </caption>
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Строка</th>
                  <th scope="col" className="px-3 py-2 font-medium">Статус</th>
                  <th scope="col" className="px-3 py-2 font-medium">Название</th>
                  <th scope="col" className="px-3 py-2 font-medium">Город, адрес</th>
                  <th scope="col" className="px-3 py-2 font-medium">Замечание</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.line} className="border-t align-top">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {r.line}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusIcon status={r.status} />
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[r.city, r.address].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > PREVIEW_ROWS ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Показаны первые {PREVIEW_ROWS} из {rows.length} строк. Все ошибки
              есть в отчёте.
            </div>
          ) : null}
        </section>
      ) : null}

      {rows.length > 0 && phase !== "idle" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4">
          <div className="grid gap-2 text-sm text-muted-foreground">
            {phase === "ready" && hasProblems ? (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={onlyValid}
                  onChange={(e) => setOnlyValid(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Импортировать только корректные строки ({counts.valid}),
                  строки с ошибками ({counts.invalid}) пропустить
                </span>
              </label>
            ) : (
              <span>
                {phase === "ready" && counts.valid > 0
                  ? `К созданию: ${counts.valid}.`
                  : phase === "ready"
                    ? "Нет строк, которые можно импортировать."
                    : ""}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {reportCount > 0 && !busy ? (
              <button
                type="button"
                onClick={downloadErrorReport}
                className="clarify-button-secondary-sm inline-flex items-center gap-2"
              >
                <Download aria-hidden className="h-4 w-4" />
                Отчёт об ошибках ({reportCount})
              </button>
            ) : null}

            <button
              type="button"
              disabled={!canImport}
              onClick={onImport}
              className="clarify-button-primary-sm"
            >
              {phase === "importing" ? "Импорт..." : "Импортировать"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
