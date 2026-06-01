/**
 * Minimal {{variable}} template rendering.
 */

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** Return the unique variable names referenced in a template. */
export function templateVars(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(VAR_RE)) found.add(m[1]);
  return [...found];
}

/**
 * Render a template, substituting {{var}} with values. Throws if a referenced
 * variable is missing, so typos fail loudly instead of silently.
 */
export function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(VAR_RE, (_, name: string) => {
    if (!(name in vars)) {
      throw new Error(`Missing template variable: "${name}"`);
    }
    const v = vars[name];
    return typeof v === "string" ? v : JSON.stringify(v);
  });
}
