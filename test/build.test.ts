import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withBuildLock } from "./build-lock.ts";

const root = join(import.meta.dir, "..");

test("the bundle stays local and still injects outlines into every frame", async () => {
  await withBuildLock(async () => {
    const proc = Bun.spawn(["bun", "run", "build"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    expect(code).toBe(0);
    expect(stderr.toLowerCase()).not.toContain("error");

    const bundled = readFileSync(join(root, "extension/background.js"), "utf8");
    expect(bundled).toContain("outlines.css");
    expect(bundled).toContain("allFrames");
    expect(bundled).not.toMatch(/https?:\/\//);
  });
});
