# prompteval

[![CI](https://github.com/ReflexUK/prompteval/actions/workflows/ci.yml/badge.svg)](https://github.com/ReflexUK/prompteval/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/prompteval.svg)](https://www.npmjs.com/package/prompteval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A tiny prompt evaluation harness. Run one prompt across many models, then score and compare the outputs with an LLM judge — from a single YAML file.**

No framework, no accounts, no server. Define a suite, run it, get a Markdown leaderboard.

```console
$ prompteval run examples/summarize.yaml
```

```markdown
# prompteval — Summarization quality

## Leaderboard (avg score)
| Rank | Model | Avg score |
| --- | --- | --- |
| 1 | `anthropic/claude-sonnet-4-5` | 9.00 |
| 2 | `openai/gpt-4o-mini` | 7.50 |
```

## Install

```bash
npm install -g prompteval
# or: npx prompteval run suite.yaml
```

## Define a suite

```yaml
name: Summarization quality
system: You are a concise assistant.
prompt: |
  Summarize the following text in one sentence:

  {{text}}
models:
  - anthropic/claude-sonnet-4-5
  - openai/gpt-4o-mini
cases:
  - name: solar
    vars:
      text: "The Sun is the star at the center of the Solar System..."
    expected: "The Sun is the fusion-powered star at the center of the Solar System."
judge:
  model: anthropic/claude-sonnet-4-5
  rubric: Reward a single accurate sentence; penalize fluff or omissions.
```

- **`prompt`** — a template with `{{var}}` placeholders.
- **`models`** — `provider/model` specs; a suite can mix providers.
- **`cases`** — each supplies `vars` (and optional `expected`). Omit for a single no-variable run.
- **`judge`** *(optional)* — if present, every output is scored 1–10 against the rubric and a leaderboard is produced.

## Run it

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

prompteval run suite.yaml                       # report to stdout
prompteval run suite.yaml --out report.md       # write to a file
prompteval run suite.yaml --models openai/gpt-4o-mini   # override models
```

Point at a local or gateway endpoint with `ANTHROPIC_BASE_URL` / `OPENAI_BASE_URL`.

## Why

Comparing prompts and models usually means a notebook full of copy-paste or a heavyweight eval platform. prompteval is the in-between: a declarative file you can commit next to your code and run in CI to catch prompt regressions.

## How it works

1. Parse and validate the suite (YAML or JSON).
2. For each **case × model**, render the template and call the model.
3. If a judge is configured, score each output against the rubric and parse `SCORE: n`.
4. Aggregate per-model averages and render a Markdown report + leaderboard.

The provider calls are the only side effect — templating, scoring, aggregation, and reporting are pure and unit-tested. Per-cell errors are captured so one failing model never aborts the run.

## Supported providers

| Provider | Spec prefix | Endpoint |
|----------|-------------|----------|
| Anthropic | `anthropic/` | `/v1/messages` |
| OpenAI (and compatible) | `openai/` | `/v1/chat/completions` |

## Development

```bash
npm install
npm test       # node:test, fully offline (providers are injected)
npm run build
```

## License

[MIT](LICENSE) © ReflexUK
