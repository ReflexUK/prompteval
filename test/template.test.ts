import { test } from "node:test";
import assert from "node:assert/strict";
import { render, templateVars } from "../src/template.ts";

test("templateVars finds unique variables", () => {
  assert.deepEqual(
    templateVars("Hi {{name}}, {{name}} the {{role}}").sort(),
    ["name", "role"],
  );
});

test("render substitutes string and JSON values", () => {
  assert.equal(render("Hi {{name}}", { name: "Ada" }), "Hi Ada");
  assert.equal(render("n={{n}}", { n: 42 }), "n=42");
  assert.equal(render("o={{o}}", { o: { a: 1 } }), 'o={"a":1}');
});

test("render throws on missing variable", () => {
  assert.throws(() => render("Hi {{missing}}", {}), /Missing template variable/);
});

test("render tolerates whitespace in braces", () => {
  assert.equal(render("{{ name }}", { name: "x" }), "x");
});
