/**
 * Render a run result as a Markdown report.
 */
import type { RunResult } from "./run.js";
import { scoreByModel } from "./run.js";

function truncate(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n - 1) + "..." : oneLine;
}

/** Whether a cell passes the minScore threshold (if one is set). */
function passLabel(score: number | null, minScore?: number): string {
  if (score == null || minScore == null) return "";
  return score >= minScore ? " PASS" : " FAIL";
}

export function renderMarkdown(
  result: RunResult,
  opts: { hasJudge: boolean; minScore?: number },
): string {
  const lines: string[] = [`# prompteval -- ${result.suite}`, ""];

  if (opts.hasJudge) {
    const avg = scoreByModel(result);
    const ranked = [...avg.entries()].sort(
      (a, b) => (b[1] ?? -1) - (a[1] ?? -1),
    );
    lines.push("## Leaderboard (avg score)", "");

    const header =
      opts.minScore != null
        ? "| Rank | Model | Avg score | Threshold | Status |"
        : "| Rank | Model | Avg score |";
    const sep =
      opts.minScore != null
        ? "| --- | --- | --- | --- | --- |"
        : "| --- | --- | --- |";
    lines.push(header, sep);

    ranked.forEach(([model, score], i) => {
      const scoreStr = score == null ? "--" : score.toFixed(2);
      if (opts.minScore != null) {
        const status =
          score == null ? "--" : score >= opts.minScore ? "PASS" : "FAIL";
        lines.push(
          `| ${i + 1} | \`${model}\` | ${scoreStr} | ${opts.minScore} | ${status} |`,
        );
      } else {
        lines.push(`| ${i + 1} | \`${model}\` | ${scoreStr} |`);
      }
    });
    lines.push("");
  }

  lines.push("## Results", "");
  const header = opts.hasJudge
    ? "| Case | Model | Score | ms | Output |"
    : "| Case | Model | ms | Output |";
  const sep = opts.hasJudge
    ? "| --- | --- | --- | --- | --- |"
    : "| --- | --- | --- | --- |";
  lines.push(header, sep);

  for (const cell of result.cells) {
    const out = cell.error ? `WARN ${cell.error}` : truncate(cell.output, 80);
    if (opts.hasJudge) {
      const label = passLabel(cell.score, opts.minScore);
      lines.push(
        `| ${cell.caseName} | \`${cell.model}\` | ${cell.score ?? "--"}${label} | ${cell.ms} | ${out} |`,
      );
    } else {
      lines.push(`| ${cell.caseName} | \`${cell.model}\` | ${cell.ms} | ${out} |`);
    }
  }
  lines.push("");

  if (opts.hasJudge && opts.minScore != null) {
    const failing = result.cells.filter(
      (c) => c.score != null && c.score < opts.minScore!,
    );
    if (failing.length > 0) {
      lines.push(
        `> **${failing.length} cell(s) below minScore threshold of ${opts.minScore}.**`,
        "",
      );
    } else {
      lines.push(`> All cells meet the minScore threshold of ${opts.minScore}.`, "");
    }
  }

  return lines.join("\n");
}