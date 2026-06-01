import { test } from "node:test";
import assert from "node:assert/strict";
import { buildJudgePrompt, parseScore } from "../src/judge.ts";

test("parseScore extracts and clamps the score", () => {
  assert.equal(parseScore("SCORE: 8\nGood answer").score, 8);
  assert.equal(parseScore("SCORE: 99").score, 10); // clamped
  assert.equal(parseScore("score: 1.5 because").score, 1.5);
});

test("parseScore returns null when no score present", () => {
  assert.equal(parseScore("I think it's fine").score, null);
});

test("parseScore strips the score line from reasoning", () => {
  const r = parseScore("SCORE: 7\nClear and correct.");
  assert.equal(r.score, 7);
  assert.ok(r.reasoning.includes("Clear and correct"));
  assert.ok(!r.reasoning.includes("SCORE"));
});

test("buildJudgePrompt includes rubric, output, and optional expected", () => {
  const p = buildJudgePrompt("accuracy", "the prompt", "the output", "the ideal");
  assert.ok(p.includes("accuracy"));
  assert.ok(p.includes("the output"));
  assert.ok(p.includes("the ideal"));
  assert.ok(p.includes("SCORE:"));
});
