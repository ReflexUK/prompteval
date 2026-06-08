import { test } from "node:test";
import assert from "node:assert/strict";
import { parseModelSpec, parseSuiteString, validateSuite } from "../src/config.ts";

const VALID = {
  name: "demo",
  prompt: "Summarize: {{text}}",
  models: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4-5"],
  cases: [{ name: "short", vars: { text: "hello" } }],
};

test("validateSuite accepts a valid suite", () => {
  const s = validateSuite(VALID);
  assert.equal(s.name, "demo");
  assert.equal(s.models.length, 2);
  assert.equal(s.cases.length, 1);
});

test("validateSuite defaults cases to a single empty case", () => {
  const s = validateSuite({ prompt: "hi", models: ["openai/x"] });
  assert.deepEqual(s.cases, [{}]);
});

test("validateSuite rejects missing prompt", () => {
  assert.throws(() => validateSuite({ models: ["openai/x"] }), /prompt is required/);
});

test("validateSuite rejects empty models", () => {
  assert.throws(() => validateSuite({ prompt: "hi", models: [] }), /models is required/);
});

test("validateSuite rejects model spec without provider", () => {
  assert.throws(
    () => validateSuite({ prompt: "hi", models: ["gpt-4o-mini"] }),
    /provider\/model/,
  );
});

test("validateSuite validates judge shape", () => {
  assert.throws(
    () =>
      validateSuite({
        prompt: "hi",
        models: ["openai/x"],
        judge: { model: "openai/y" },
      }),
    /judge must have/,
  );
  const ok = validateSuite({
    prompt: "hi",
    models: ["openai/x"],
    judge: { model: "openai/y", rubric: "be good" },
  });
  assert.equal(ok.judge?.model, "openai/y");
  assert.equal(ok.judge?.minScore, undefined);
});

test("validateSuite accepts judge with valid minScore", () => {
  const s = validateSuite({
    prompt: "hi",
    models: ["openai/x"],
    judge: { model: "openai/y", rubric: "be good", minScore: 7 },
  });
  assert.equal(s.judge?.minScore, 7);
});

test("validateSuite rejects minScore outside 1-10", () => {
  assert.throws(
    () =>
      validateSuite({
        prompt: "hi",
        models: ["openai/x"],
        judge: { model: "openai/y", rubric: "r", minScore: 0 },
      }),
    /minScore must be/,
  );
  assert.throws(
    () =>
      validateSuite({
        prompt: "hi",
        models: ["openai/x"],
        judge: { model: "openai/y", rubric: "r", minScore: 11 },
      }),
    /minScore must be/,
  );
});

test("parseSuiteString reads YAML", () => {
  const yaml = `name: y
prompt: "Hi {{n}}"
models:
  - openai/gpt-4o-mini
`;
  const s = parseSuiteString(yaml);
  assert.equal(s.name, "y");
  assert.equal(s.models[0], "openai/gpt-4o-mini");
});

test("parseSuiteString reads YAML with minScore", () => {
  const yaml = `name: threshold
prompt: "Hello"
models:
  - openai/gpt-4o-mini
judge:
  model: openai/gpt-4o-mini
  rubric: be accurate
  minScore: 6
`;
  const s = parseSuiteString(yaml);
  assert.equal(s.judge?.minScore, 6);
});

test("parseModelSpec splits provider and model", () => {
  assert.deepEqual(parseModelSpec("anthropic/claude-sonnet-4-5"), {
    provider: "anthropic",
    model: "claude-sonnet-4-5",
  });
});