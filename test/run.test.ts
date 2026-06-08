import { test } from "node:test";
import assert from "node:assert/strict";
import { runSuite, scoreByModel } from "../src/run.ts";
import { renderMarkdown } from "../src/report.ts";
import { validateSuite } from "../src/config.ts";

const suite = validateSuite({
  name: "t",
  prompt: "Echo {{x}}",
  models: ["openai/a", "anthropic/b"],
  cases: [{ name: "c1", vars: { x: "1" } }, { name: "c2", vars: { x: "2" } }],
  judge: { model: "openai/judge", rubric: "good" },
});

function makeComplete() {
  let t = 0;
  const complete = async (model: string, prompt: string) => {
    if (model === "openai/judge") return "SCORE: 7\nfine";
    return `${model} -> ${prompt}`;
  };
  const now = () => (t += 5);
  return { complete, now };
}

test("runSuite produces a cell per case x model", async () => {
  const { complete, now } = makeComplete();
  const result = await runSuite(suite, { complete, now });
  assert.equal(result.cells.length, 4);
  const c = result.cells[0];
  assert.ok(c.output.includes("Echo 1"));
  assert.equal(c.score, 7);
  assert.ok(c.ms > 0);
});

test("runSuite records errors per cell without aborting", async () => {
  const complete = async (model: string) => {
    if (model === "openai/a") throw new Error("boom");
    return "ok";
  };
  const result = await runSuite(
    validateSuite({ prompt: "p", models: ["openai/a", "anthropic/b"] }),
    { complete, now: (() => { let t = 0; return () => (t += 1); })() },
  );
  const a = result.cells.find((c) => c.model === "openai/a")!;
  const b = result.cells.find((c) => c.model === "anthropic/b")!;
  assert.match(a.error!, /boom/);
  assert.equal(b.output, "ok");
});

test("scoreByModel averages across cases", async () => {
  const { complete, now } = makeComplete();
  const result = await runSuite(suite, { complete, now });
  const avg = scoreByModel(result);
  assert.equal(avg.get("openai/a"), 7);
  assert.equal(avg.get("anthropic/b"), 7);
});

test("scoreByModel returns null for models with no scored cells", async () => {
  const result = {
    suite: "x",
    cells: [{ model: "openai/a", caseName: "c1", output: "hi", score: null, ms: 1 }],
  };
  const avg = scoreByModel(result);
  assert.equal(avg.get("openai/a"), null);
});

test("renderMarkdown includes leaderboard when judged", async () => {
  const { complete, now } = makeComplete();
  const result = await runSuite(suite, { complete, now });
  const md = renderMarkdown(result, { hasJudge: true });
  assert.ok(md.includes("# prompteval"));
  assert.ok(md.includes("Leaderboard"));
  assert.ok(md.includes("| Rank | Model | Avg score |"));
  assert.ok(md.includes("`openai/a`"));
});

test("renderMarkdown omits leaderboard without judge", () => {
  const result = { suite: "x", cells: [] };
  const md = renderMarkdown(result, { hasJudge: false });
  assert.ok(!md.includes("Leaderboard"));
  assert.ok(md.includes("## Results"));
});

test("renderMarkdown shows PASS/FAIL when minScore is set", async () => {
  const { complete, now } = makeComplete(); // judge always returns 7
  const result = await runSuite(suite, { complete, now });
  const mdPass = renderMarkdown(result, { hasJudge: true, minScore: 5 });
  assert.ok(mdPass.includes("PASS"), "expected PASS for score 7 >= minScore 5");

  const mdFail = renderMarkdown(result, { hasJudge: true, minScore: 9 });
  assert.ok(mdFail.includes("FAIL"), "expected FAIL for score 7 < minScore 9");
});

test("renderMarkdown includes threshold summary line", async () => {
  const { complete, now } = makeComplete();
  const result = await runSuite(suite, { complete, now });
  const md = renderMarkdown(result, { hasJudge: true, minScore: 9 });
  assert.ok(md.includes("below minScore threshold"));
});