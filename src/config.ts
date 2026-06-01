/**
 * Suite configuration: the prompt, the models to run it on, the test cases,
 * and an optional judge rubric. Parsed from YAML or JSON.
 */
import { parse as parseYaml } from "yaml";

export interface Case {
  /** Optional name for the row in the report. */
  name?: string;
  /** Variables substituted into the prompt template. */
  vars?: Record<string, unknown>;
  /** Optional expectation passed to the judge as the ideal answer. */
  expected?: string;
}

export interface Suite {
  name: string;
  /** Prompt template with {{var}} placeholders. */
  prompt: string;
  /** Optional system prompt. */
  system?: string;
  /** Model specs like "anthropic/claude-sonnet-4-5" or "openai/gpt-4o-mini". */
  models: string[];
  /** Test cases. Defaults to a single case with no vars. */
  cases: Case[];
  /** Optional judge rubric; if set, outputs are scored 1-10. */
  judge?: {
    model: string;
    rubric: string;
  };
}

export function parseSuiteString(raw: string): Suite {
  const trimmed = raw.trimStart();
  const obj = trimmed.startsWith("{") ? JSON.parse(raw) : parseYaml(raw);
  return validateSuite(obj);
}

/** Validate and normalize an arbitrary object into a Suite. */
export function validateSuite(obj: unknown): Suite {
  if (!obj || typeof obj !== "object") {
    throw new Error("Suite must be an object");
  }
  const s = obj as Record<string, any>;

  if (typeof s.prompt !== "string" || !s.prompt.trim()) {
    throw new Error("Suite.prompt is required and must be a non-empty string");
  }
  if (!Array.isArray(s.models) || s.models.length === 0) {
    throw new Error("Suite.models is required and must be a non-empty array");
  }
  for (const m of s.models) {
    if (typeof m !== "string" || !m.includes("/")) {
      throw new Error(
        `Invalid model spec "${m}". Use "provider/model", e.g. "openai/gpt-4o-mini".`,
      );
    }
  }

  let cases: Case[];
  if (s.cases === undefined) {
    cases = [{}];
  } else if (Array.isArray(s.cases)) {
    cases = s.cases.map((c: any, i: number) => {
      if (c && typeof c === "object") return c as Case;
      throw new Error(`Suite.cases[${i}] must be an object`);
    });
    if (cases.length === 0) cases = [{}];
  } else {
    throw new Error("Suite.cases must be an array");
  }

  if (s.judge !== undefined) {
    if (
      !s.judge ||
      typeof s.judge !== "object" ||
      typeof s.judge.model !== "string" ||
      typeof s.judge.rubric !== "string"
    ) {
      throw new Error("Suite.judge must have { model: string, rubric: string }");
    }
  }

  return {
    name: typeof s.name === "string" ? s.name : "Untitled suite",
    prompt: s.prompt,
    system: typeof s.system === "string" ? s.system : undefined,
    models: s.models,
    cases,
    judge: s.judge,
  };
}

/** Split "provider/model" into its parts. */
export function parseModelSpec(spec: string): { provider: string; model: string } {
  const idx = spec.indexOf("/");
  return { provider: spec.slice(0, idx), model: spec.slice(idx + 1) };
}
