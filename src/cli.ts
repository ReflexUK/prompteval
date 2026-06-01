#!/usr/bin/env node
/**
 * prompteval CLI: run a suite file and print/write a Markdown report.
 *
 *   prompteval run suite.yaml
 *   prompteval run suite.yaml --models openai/gpt-4o-mini,anthropic/claude-sonnet-4-5
 *   prompteval run suite.yaml --out report.md
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseSuiteString, type Suite } from "./config.js";
import { complete } from "./providers.js";
import { runSuite } from "./run.js";
import { renderMarkdown } from "./report.js";

const HELP = `prompteval — run one prompt across many models and score the outputs

Usage:
  prompteval run <suite.yaml|json> [options]

Options:
  --models <a,b>   Comma-separated model specs to override the suite's models
  --out <file>     Write the Markdown report to a file (default: stdout)
  -h, --help       Show this help

Model specs are "provider/model", e.g. "openai/gpt-4o-mini",
"anthropic/claude-sonnet-4-5". Set ANTHROPIC_API_KEY / OPENAI_API_KEY.
Override endpoints with ANTHROPIC_BASE_URL / OPENAI_BASE_URL.
`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    process.stdout.write(HELP);
    process.exit(argv.length === 0 ? 1 : 0);
  }
  if (argv[0] !== "run") {
    throw new Error(`Unknown command "${argv[0]}". Try: prompteval run <suite>`);
  }

  let suitePath: string | undefined;
  let modelsOverride: string[] | undefined;
  let outFile: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--models") modelsOverride = argv[++i]?.split(",").map((s) => s.trim());
    else if (a === "--out") outFile = argv[++i];
    else if (!a.startsWith("-") && !suitePath) suitePath = a;
  }
  if (!suitePath) throw new Error("Provide a suite file: prompteval run <suite.yaml>");

  const suite: Suite = parseSuiteString(await readFile(suitePath, "utf8"));
  if (modelsOverride && modelsOverride.length) suite.models = modelsOverride;

  process.stderr.write(
    `Running "${suite.name}": ${suite.cases.length} case(s) × ${suite.models.length} model(s)` +
      (suite.judge ? ` (judge: ${suite.judge.model})` : "") +
      "\n",
  );

  const result = await runSuite(suite, {
    complete: (model, prompt, opts) => complete(model, prompt, { system: opts.system }),
  });

  const md = renderMarkdown(result, { hasJudge: Boolean(suite.judge) });
  if (outFile) {
    await writeFile(outFile, md, "utf8");
    process.stderr.write(`Wrote ${outFile}\n`);
  } else {
    process.stdout.write(md + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`prompteval: ${(err as Error).message}\n`);
  process.exit(1);
});
