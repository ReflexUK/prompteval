/**
 * LLM-as-judge scoring. We ask the judge to rate an output 1-10 against a
 * rubric and parse the score out of its reply.
 */
export interface JudgeResult {
  score: number | null;
  reasoning: string;
}

export function buildJudgePrompt(
  rubric: string,
  prompt: string,
  output: string,
  expected?: string,
): string {
  const parts = [
    "You are an impartial evaluator. Score the candidate output on a scale of 1 to 10.",
    `Rubric: ${rubric}`,
    `--- Original prompt ---\n${prompt}`,
  ];
  if (expected) parts.push(`--- Reference / ideal answer ---\n${expected}`);
  parts.push(`--- Candidate output ---\n${output}`);
  parts.push(
    'Respond with ONLY a line "SCORE: <n>" (n is 1-10), then a short one-line justification.',
  );
  return parts.join("\n\n");
}

/** Extract a 1-10 score from the judge's reply. Returns null if not found. */
export function parseScore(reply: string): JudgeResult {
  const m = reply.match(/SCORE:\s*(\d+(?:\.\d+)?)/i);
  let score: number | null = null;
  if (m) {
    const n = Number(m[1]);
    if (!Number.isNaN(n)) score = Math.max(1, Math.min(10, n));
  }
  const reasoning = reply.replace(/SCORE:\s*\d+(?:\.\d+)?/i, "").trim();
  return { score, reasoning };
}
