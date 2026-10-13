import { expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8")) as {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions?: unknown;
  content_scripts?: unknown;
  commands?: unknown;
  web_accessible_resources?: unknown;
  background: { service_worker: string; type?: string };
  action: {
    default_title?: string;
    default_popup?: string;
    default_icon: Record<string, string>;
  };
  icons: Record<string, string>;
};

test("the manifest is a one-button extension with no standing site access", () => {
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.name).toBe("pestctrl");
  expect(manifest.version).toBe("0.1.0");
  expect(manifest.description).toBe("Outline every element on the page.");
  expect(manifest.permissions).toEqual(["activeTab", "scripting"]);
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.commands).toBeUndefined();
  expect(manifest.web_accessible_resources).toBeUndefined();
  expect(manifest.action.default_popup).toBeUndefined();
  expect(manifest.action.default_title).toBe("Toggle layout outlines");
  expect(manifest.background).toEqual({
    service_worker: "background.js",
    type: "module",
  });
});

test("toolbar and store icons exist", () => {
  const paths = new Set([
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
  ]);
  expect([...paths].sort()).toEqual([
    "icons/icon-128.png",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
  ]);
  for (const path of paths) {
    const file = statSync(join(root, "extension", path));
    expect(file.isFile()).toBe(true);
    expect(file.size).toBeGreaterThan(0);
  }
});
