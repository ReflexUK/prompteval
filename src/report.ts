/**
 * Render a run result as a Markdown report.
 */
import type { RunResult } from "./run.js";
import { scoreByModel } from "./run.js";

function truncate(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n - 1) + "…" : oneLine;
}

export function renderMarkdown(result: RunResult, opts: { hasJudge: boolean }): string {
  const lines: string[] = [`# prompteval — ${result.suite}`, ""];

  if (opts.hasJudge) {
    const avg = scoreByModel(result);
    const ranked = [...avg.entries()].sort(
      (a, b) => (b[1] ?? -1) - (a[1] ?? -1),
    );
    lines.push("## Leaderboard (avg score)", "");
    lines.push("| Rank | Model | Avg score |", "| --- | --- | --- |");
    ranked.forEach(([model, score], i) => {
      lines.push(`| ${i + 1} | \`${model}\` | ${score == null ? "—" : score.toFixed(2)} |`);
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
    const out = cell.error ? `⚠️ ${cell.error}` : truncate(cell.output, 80);
    if (opts.hasJudge) {
      lines.push(
        `| ${cell.caseName} | \`${cell.model}\` | ${cell.score ?? "—"} | ${cell.ms} | ${out} |`,
      );
    } else {
      lines.push(`| ${cell.caseName} | \`${cell.model}\` | ${cell.ms} | ${out} |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}
