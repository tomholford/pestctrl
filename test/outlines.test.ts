import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "../extension/outlines.css"), "utf8");

const requiredSelectors = [
  "*",
  "div",
  "span",
  "section",
  "article",
  "nav",
  "header",
  "footer",
  "main",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "picture",
  "video",
  "canvas",
  "svg",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "label",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "pre",
  "code",
  "figure",
  "figcaption",
  "blockquote",
  "iframe",
  "*::before",
  "*::after",
];

type Rule = { selectors: string[]; declarations: string[] };

function parseRules(source: string): Rule[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  for (const block of stripped.split("}")) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const open = trimmed.indexOf("{");
    if (open === -1) throw new Error(`rule is missing {: ${trimmed}`);
    const selectorText = trimmed.slice(0, open).trim();
    if (selectorText.startsWith("@")) throw new Error(`at-rule is not allowed: ${selectorText}`);
    const body = trimmed.slice(open + 1).trim();
    const declarations = body
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.length > 0);
    const selectors = selectorText
      .split(",")
      .map((selector) => selector.trim())
      .filter((selector) => selector.length > 0);
    rules.push({ selectors, declarations });
  }
  return rules;
}

test("every rule is a 1px solid outline and the named elements are covered", () => {
  const rules = parseRules(css);
  expect(rules.length).toBeGreaterThan(0);

  const seen = new Set<string>();
  for (const rule of rules) {
    expect(rule.selectors.length).toBeGreaterThan(0);
    expect(rule.declarations).toHaveLength(1);
    expect(rule.declarations[0]).toMatch(/^outline: 1px solid #[0-9a-f]{6} !important$/);
    for (const selector of rule.selectors) seen.add(selector);
  }

  for (const selector of requiredSelectors) {
    expect(seen.has(selector)).toBe(true);
  }
});
