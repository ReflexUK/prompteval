/**
 * Orchestrate running a suite: every case × every model, with optional judging.
 * The completion function is injected so the orchestration is unit-testable
 * without network access.
 */
import type { Case, Suite } from "./config.js";
import { render } from "./template.js";
import { buildJudgePrompt, parseScore } from "./judge.js";

export interface CellResult {
  model: string;
  caseName: string;
  output: string;
  score: number | null;
  error?: string;
  ms: number;
}

export interface RunResult {
  suite: string;
  cells: CellResult[];
}

export type CompleteFn = (
  modelSpec: string,
  prompt: string,
  opts: { system?: string },
) => Promise<string>;

export interface RunDeps {
  complete: CompleteFn;
  /** Monotonic clock, injectable for deterministic tests. */
  now?: () => number;
}

function caseName(c: Case, i: number): string {
  return c.name ?? `case ${i + 1}`;
}

export async function runSuite(suite: Suite, deps: RunDeps): Promise<RunResult> {
  const now = deps.now ?? (() => Date.now());
  const cells: CellResult[] = [];

  for (let ci = 0; ci < suite.cases.length; ci++) {
    const c = suite.cases[ci];
    const rendered = render(suite.prompt, c.vars ?? {});
    for (const model of suite.models) {
      const start = now();
      const cell: CellResult = {
        model,
        caseName: caseName(c, ci),
        output: "",
        score: null,
        ms: 0,
      };
      try {
        cell.output = await deps.complete(model, rendered, { system: suite.system });
        if (suite.judge) {
          const judgePrompt = buildJudgePrompt(
            suite.judge.rubric,
            rendered,
            cell.output,
            c.expected,
          );
          const judgeReply = await deps.complete(suite.judge.model, judgePrompt, {});
          cell.score = parseScore(judgeReply).score;
        }
      } catch (err) {
        cell.error = (err as Error).message;
      }
      cell.ms = now() - start;
      cells.push(cell);
    }
  }

  return { suite: suite.name, cells };
}

/** Average score per model across all cases (ignoring nulls). */
export function scoreByModel(result: RunResult): Map<string, number | null> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const cell of result.cells) {
    if (cell.score == null) continue;
    const acc = sums.get(cell.model) ?? { total: 0, n: 0 };
    acc.total += cell.score;
    acc.n += 1;
    sums.set(cell.model, acc);
  }
  const out = new Map<string, number | null>();
  for (const model of new Set(result.cells.map((c) => c.model))) {
    const acc = sums.get(model);
    out.set(model, acc && acc.n > 0 ? acc.total / acc.n : null);
  }
  return out;
}
